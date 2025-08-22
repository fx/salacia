import type { APIRoute } from 'astro';
import { AnthropicRequestSchema, type AnthropicRequest } from '../../../lib/ai/types';
import { AIService } from '../../../lib/ai/ai-service';
import {
  validateHeaders,
  parseRequestBody,
  createErrorResponse,
  API_ERROR_TYPES,
  handleOptions,
  CORS_HEADERS,
} from '../../../lib/ai/api-utils';
import { createLogger } from '../../../lib/utils/logger';
import { logAiInteraction, logApiRequest } from '../../../lib/services/message-logger';
import { ProviderManager } from '../../../lib/ai/provider-manager';
import { ProviderFactory } from '../../../lib/ai/provider-factory';
import { generateMessageId } from '../../../lib/ai/api-utils';
import { getClaudeCodeToken } from '../../../lib/utils/auth';

const logger = createLogger('API/Messages');

/**
 * Anthropic-compatible API endpoint for chat completions
 *
 * This endpoint provides compatibility with the Anthropic API format
 * while allowing the backend to route requests to different providers.
 *
 * Handles both streaming and non-streaming requests.
 */
export const OPTIONS: APIRoute = () => handleOptions();

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  let requestData: AnthropicRequest | null = null;

  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    logger.debug('Incoming headers from Claude Code:', headers);

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // TODO: Replace global variable with proper state management solution
      // This temporary solution stores Claude Code tokens globally for provider access
      // In production, consider using a request context or dependency injection pattern
      (globalThis as unknown as { __claudeCodeToken?: string }).__claudeCodeToken =
        authHeader.substring(7);

      const freshToken = authHeader.substring(7);
      if (freshToken.startsWith('sk-ant-oat')) {
        import('../../../lib/ai/provider-manager').then(({ ProviderManager }) => {
          ProviderManager.updateOAuthToken(freshToken).catch(err => {
            logger.debug('Failed to update OAuth token:', err);
          });
        });
      }
    }

    // Validate headers
    const headerValidation = validateHeaders(request);
    if (!headerValidation.isValid) {
      return headerValidation.error!;
    }

    // Parse and validate request body
    const { data: parsedData, error: parseError } = await parseRequestBody(request, data => {
      // Only log a summary in debug mode - full requests are too verbose
      if (data && typeof data === 'object' && 'model' in data) {
        // Use proper type guards instead of type assertion
        const hasModel = 'model' in data;
        const hasMessages = 'messages' in data && Array.isArray(data.messages);
        const hasMaxTokens = 'max_tokens' in data;
        const hasSystem = 'system' in data;

        if (hasModel) {
          const hasStream = 'stream' in data;
          const summary = {
            model: data.model,
            messageCount: hasMessages ? (data as { messages: unknown[] }).messages.length : 0,
            maxTokens: hasMaxTokens ? data.max_tokens : 'default',
            hasSystem: hasSystem,
            stream: hasStream ? data.stream : 'not specified',
          };
          logger.debug('Request summary:', summary);
        }
      }
      return AnthropicRequestSchema.parse(data);
    });

    if (parseError) {
      return parseError;
    }

    if (!parsedData) {
      return createErrorResponse(
        API_ERROR_TYPES.INVALID_REQUEST_ERROR,
        'Failed to parse request data',
        400
      );
    }

    requestData = parsedData;

    // Check if streaming is requested
    const isStreaming = requestData!.stream === true;

    if (isStreaming) {
      // Get provider and check if it's OAuth
      const provider = await ProviderManager.ensureDefaultProvider();

      // For OAuth providers, we need to use the AnthropicClient directly with streaming
      if (provider.authType === 'oauth' && provider.type === 'anthropic') {
        const claudeCodeToken = getClaudeCodeToken();
        const tokenToUse = claudeCodeToken || provider.oauthAccessToken;

        if (!tokenToUse) {
          return createErrorResponse(
            API_ERROR_TYPES.PERMISSION_ERROR,
            'No OAuth token available for provider',
            503
          );
        }

        logger.debug('Using OAuth streaming with AnthropicClient', {
          hasClaudeCodeToken: !!claudeCodeToken,
          provider: provider.name,
        });

        // Import and use AnthropicClient with streaming
        const { AnthropicClient } = await import('../../../lib/ai/providers');
        const anthropicClient = new AnthropicClient(
          tokenToUse,
          provider.baseUrl || 'https://api.anthropic.com/v1'
        );

        const responseTime = Date.now() - startTime;

        // Log streaming request - create initial database record
        const interaction = await logAiInteraction({
          request: requestData!,
          response: undefined, // Response will be updated when stream completes
          responseTime,
          statusCode: 200,
          providerId: provider.id,
        });

        // Log API request
        await logApiRequest({
          request,
          statusCode: 200,
          responseTime,
        });

        // Use AnthropicClient's streaming method directly
        const stream = await anthropicClient.createStreamingMessage(requestData!);

        // Import and wrap with tracking stream to capture response
        const { createTrackingStream } = await import('../../../lib/ai/streaming-tracker');
        const trackedStream = createTrackingStream(stream, interaction?.id || 'unknown');

        return new Response(trackedStream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Response-Time': `${responseTime}ms`,
            ...CORS_HEADERS,
          },
        });
      }

      // Declare result variable to hold streaming response
      let result: { fullStream: { getReader: () => any } };
      let finalModelName = requestData!.model; // Track the final model name used

      // Track tool calls and their arguments for proper streaming (used by non-Ollama providers)
      const toolCallsMap = new Map<string, { name: string; args: any }>();
      // Track tool input as it streams in
      const toolInputBuffer = new Map<string, string>();

      // Handle Ollama providers with direct streaming to bypass AI SDK issues
      if (provider.type === 'ollama') {
        // Model resolution for Ollama
        let reqModel = requestData!.model;
        const anthropicLike =
          !reqModel ||
          reqModel === 'default' ||
          /^(claude|gpt|mixtral|gemma|sonnet|haiku)/i.test(reqModel);
        if (anthropicLike) {
          reqModel = await ProviderManager.getOllamaDefaultModel(provider);
        }

        finalModelName = reqModel; // Store the resolved model name

        logger.debug('Ollama model selection', {
          requested: requestData!.model,
          resolved: reqModel,
        });

        // Convert Anthropic format to OpenAI format for Ollama
        const messages: Array<{ role: string; content: string }> = [];

        if (requestData!.system) {
          let systemContent: string;
          if (typeof requestData!.system === 'string') {
            systemContent = requestData!.system;
          } else if (Array.isArray(requestData!.system)) {
            systemContent = requestData!.system
              .filter(
                block => block.type === 'text' && 'text' in block && typeof block.text === 'string'
              )
              .map(block => block.text)
              .join('\n');
          } else {
            systemContent = '';
          }
          if (systemContent) {
            messages.push({ role: 'system', content: systemContent });
          }
        }

        // Convert messages
        for (const message of requestData!.messages) {
          let content: string;

          if (typeof message.content === 'string') {
            content = message.content;
          } else if (Array.isArray(message.content)) {
            content = message.content
              .filter(
                block => block.type === 'text' && 'text' in block && typeof block.text === 'string'
              )
              .map(block => (block as { type: 'text'; text: string }).text)
              .join('\n');
          } else {
            content = '';
          }

          messages.push({ role: message.role, content });
        }

        // Use direct Ollama streaming
        const { createOllamaStream } = await import('../../../lib/ai/providers/ollama/streaming');
        const baseUrl = provider.baseUrl || 'http://localhost:11434';
        const apiKey = provider.apiKey || 'ollama';

        const ollamaStreamOptions = {
          baseUrl,
          apiKey,
          model: reqModel,
          messages,
          ...(requestData!.max_tokens && { maxTokens: requestData!.max_tokens }),
          ...(requestData!.temperature && { temperature: requestData!.temperature }),
          ...(requestData!.top_p && { topP: requestData!.top_p }),
        };

        logger.debug('Creating direct Ollama stream', ollamaStreamOptions);
        const ollamaStream = await createOllamaStream(ollamaStreamOptions);

        // Create a wrapper that reads from Ollama stream and converts to our format
        result = {
          fullStream: {
            getReader: () => ollamaStream.getReader(),
          },
        };

        logger.debug('Direct Ollama stream created successfully');
      } else {
        // For non-Ollama providers, use AI SDK streaming
        const client = await ProviderManager.createClient(provider);

        // For DeepInfra, use the configured model from the database
        let mappedModelId: string;
        if (
          provider.type === 'deepinfra' &&
          Array.isArray(provider.models) &&
          provider.models.length > 0
        ) {
          // Use the first configured model for DeepInfra
          mappedModelId = provider.models[0] as string;
          logger.debug('Using configured DeepInfra model', { model: mappedModelId });
        } else {
          // For other providers, use the mapping
          mappedModelId = ProviderFactory.mapModelName(
            provider.type as 'openai' | 'anthropic' | 'groq',
            requestData!.model
          );
        }

        finalModelName = mappedModelId; // Store the mapped model name

        const model = (client as any)(mappedModelId);

        // Convert Anthropic format to AI SDK format
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

        if (requestData!.system) {
          let systemContent: string;
          if (typeof requestData!.system === 'string') {
            systemContent = requestData!.system;
          } else if (Array.isArray(requestData!.system)) {
            systemContent = requestData!.system
              .filter(
                block => block.type === 'text' && 'text' in block && typeof block.text === 'string'
              )
              .map(block => block.text)
              .join('\n');
          } else {
            systemContent = '';
          }
          if (systemContent) {
            messages.push({ role: 'system', content: systemContent });
          }
        }

        // Convert messages and handle tool use blocks
        for (const message of requestData!.messages) {
          let content: string;
          let toolUseBlocks: any[] = [];

          if (typeof message.content === 'string') {
            content = message.content;
          } else if (Array.isArray(message.content)) {
            // Separate text and tool use blocks
            const textBlocks = message.content.filter(
              block => block.type === 'text' && 'text' in block && typeof block.text === 'string'
            );
            content = textBlocks
              .map(block => (block as { type: 'text'; text: string }).text)
              .join('\n');

            // Collect tool use blocks for conversion
            toolUseBlocks = message.content.filter(
              block => block.type === 'tool_use' || block.type === 'tool_result'
            );
          } else {
            content = '';
          }

          const role = message.role as 'system' | 'user' | 'assistant';

          // For now, append tool use information to the text content
          // This is a temporary solution until we properly handle tool calls
          if (toolUseBlocks.length > 0) {
            const toolInfo = toolUseBlocks
              .map(block => {
                if (block.type === 'tool_use') {
                  return `[Tool Use: ${block.name}(${JSON.stringify(block.input)})]`;
                } else if (block.type === 'tool_result') {
                  return `[Tool Result: ${block.content}]`;
                }
                return '';
              })
              .join('\n');

            if (toolInfo) {
              content = content ? `${content}\n${toolInfo}` : toolInfo;
            }
          }

          messages.push({ role, content });
        }

        // Convert to proper AI SDK prompt format
        const prompt = messages.map(msg => {
          if (msg.role === 'system') {
            return { role: 'system' as const, content: msg.content };
          } else {
            return {
              role: msg.role as 'user' | 'assistant',
              content: [{ type: 'text' as const, text: msg.content }],
            };
          }
        });

        // Convert Anthropic tools to AI SDK format if present
        let tools: any = undefined;
        if (requestData!.tools && requestData!.tools.length > 0) {
          tools = {};
          for (const tool of requestData!.tools) {
            tools[tool.name] = {
              description: tool.description,
              parameters: tool.input_schema,
              execute: async (args: any, options: any) => {
                // Track the tool call with its arguments
                const toolCallId = options?.toolCallId || `tool_${Date.now()}`;
                toolCallsMap.set(toolCallId, { name: tool.name, args });

                logger.debug(`Tool ${tool.name} called with args:`, args);

                // Return a simulated result for now
                // In production, this would actually execute the tool
                if (tool.name === 'get_weather' && args.location) {
                  return `The weather in ${args.location} is sunny and 72°F.`;
                } else if (tool.name === 'Read' && args.file_path) {
                  return `[Simulated content of ${args.file_path}]\n# Example file content\nline 1\nline 2`;
                }

                return `[Tool ${tool.name} executed with args: ${JSON.stringify(args)}]`;
              },
            };
          }
        }

        // Use AI SDK's streamText method
        const { streamText } = await import('ai');
        logger.debug('Calling AI SDK streamText with model', {
          modelType: typeof model,
          provider: provider.type,
          hasTools: !!tools,
          toolCount: requestData!.tools?.length || 0,
        });

        const streamTextOptions: any = {
          model: model as any, // Type assertion needed due to SDK version differences
          messages: prompt,
          ...(requestData!.max_tokens && { maxTokens: requestData!.max_tokens }),
          ...(requestData!.temperature && { temperature: requestData!.temperature }),
          ...(requestData!.top_p && { topP: requestData!.top_p }),
        };

        // Add tools if present
        if (tools) {
          streamTextOptions.tools = tools;
          // Enable tool use by default when tools are provided
          streamTextOptions.toolChoice = 'auto';
        }

        result = streamText(streamTextOptions);
        logger.debug('AI SDK streamText returned', { hasFullStream: !!result.fullStream });
      }

      const responseTime = Date.now() - startTime;

      // Log streaming request - create initial database record
      const interaction = await logAiInteraction({
        request: requestData!,
        response: undefined, // Response will be updated when stream completes
        responseTime,
        statusCode: 200,
        providerId: provider.id,
      });

      // Log API request
      await logApiRequest({
        request,
        statusCode: 200,
        responseTime,
      });

      // Create streaming response exactly like OpenCode does
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const id = generateMessageId();
          let hasStarted = false;
          let accumulatedContent = ''; // Track accumulated response content
          let inputTokens = 0;
          let outputTokens = 0;

          try {
            // Send message_start event first
            const messageStart = {
              type: 'message_start',
              message: {
                id,
                type: 'message',
                role: 'assistant',
                content: [],
                model: finalModelName,
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 0, output_tokens: 0 },
              },
            };
            controller.enqueue(
              encoder.encode(`event: message_start\ndata: ${JSON.stringify(messageStart)}\n\n`)
            );

            const reader = result.fullStream.getReader();
            logger.debug('Starting stream reader loop');
            let chunkCount = 0;
            try {
              while (true) {
                const { done, value: chunk } = await reader.read();
                chunkCount++;
                if (done) {
                  logger.debug(`Stream ended after ${chunkCount} chunks`);
                  break;
                }
                logger.debug(`Processing chunk ${chunkCount}`, { type: chunk.type });
                switch (chunk.type) {
                  case 'text-delta': {
                    if (!hasStarted) {
                      // Send content_block_start event
                      const contentBlockStart = {
                        type: 'content_block_start',
                        index: 0,
                        content_block: { type: 'text', text: '' },
                      };
                      controller.enqueue(
                        encoder.encode(
                          `event: content_block_start\ndata: ${JSON.stringify(contentBlockStart)}\n\n`
                        )
                      );
                      hasStarted = true;
                    }

                    // Send text delta exactly like Anthropic format
                    const text = (chunk as any).text || '';
                    accumulatedContent += text; // Accumulate response content
                    const data = {
                      type: 'content_block_delta',
                      index: 0,
                      delta: {
                        type: 'text_delta',
                        text,
                      },
                    };
                    controller.enqueue(
                      encoder.encode(
                        `event: content_block_delta\ndata: ${JSON.stringify(data)}\n\n`
                      )
                    );
                    break;
                  }

                  case 'tool-call': {
                    const toolCallId = (chunk as any).toolCallId;
                    const toolName = (chunk as any).toolName;

                    // Retrieve the args from our tracking map (should have been set by tool-input-end)
                    const toolCallData = toolCallsMap.get(toolCallId);
                    const args = toolCallData?.args || {};

                    // Update the name if we have it
                    if (toolCallData && toolName) {
                      toolCallData.name = toolName;
                    }

                    logger.debug('Tool call chunk received', {
                      toolCallId,
                      toolName,
                      args,
                      hasStoredArgs: !!toolCallData,
                    });

                    // Send tool use content block for Anthropic format
                    const toolUseBlock = {
                      type: 'content_block_start',
                      index: hasStarted ? 1 : 0,
                      content_block: {
                        type: 'tool_use',
                        id: toolCallId || `tool_${Date.now()}`,
                        name: toolName || 'unknown_tool',
                        input: args,
                      },
                    };
                    controller.enqueue(
                      encoder.encode(
                        `event: content_block_start\ndata: ${JSON.stringify(toolUseBlock)}\n\n`
                      )
                    );

                    // Send the tool use completion
                    const toolUseStop = { type: 'content_block_stop', index: hasStarted ? 1 : 0 };
                    controller.enqueue(
                      encoder.encode(
                        `event: content_block_stop\ndata: ${JSON.stringify(toolUseStop)}\n\n`
                      )
                    );

                    // Don't add tool calls to visible accumulated content
                    // The model will generate its own text response
                    hasStarted = true;
                    break;
                  }

                  case 'tool-input-start': {
                    // Initialize buffer for this tool call
                    const toolId = (chunk as any).id;
                    if (toolId) {
                      toolInputBuffer.set(toolId, '');
                      logger.debug('Tool input start', {
                        toolId,
                        toolName: (chunk as any).toolName,
                      });
                    }
                    break;
                  }

                  case 'tool-input-delta': {
                    // Accumulate tool input arguments
                    const toolId = (chunk as any).id;
                    const delta = (chunk as any).delta;
                    if (toolId && delta) {
                      const current = toolInputBuffer.get(toolId) || '';
                      toolInputBuffer.set(toolId, current + delta);
                      logger.debug('Tool input delta', { toolId, delta });
                    }
                    break;
                  }

                  case 'tool-input-end': {
                    // Parse complete tool input
                    const toolId = (chunk as any).id;
                    if (toolId) {
                      const inputStr = toolInputBuffer.get(toolId) || '{}';
                      try {
                        const args = JSON.parse(inputStr);
                        toolCallsMap.set(toolId, { name: '', args }); // Name will be set later
                        logger.debug('Tool input complete', { toolId, args });
                      } catch (e) {
                        logger.error('Failed to parse tool input', { toolId, inputStr, error: e });
                      }
                      toolInputBuffer.delete(toolId);
                    }
                    break;
                  }

                  case 'tool-call-delta': {
                    // For streaming tool calls, we could accumulate and send updates
                    // For now, we'll wait for the complete tool-call chunk
                    logger.debug('Tool call delta received', { chunk });
                    break;
                  }

                  case 'tool-result': {
                    logger.debug('Tool result received', {
                      toolCallId: (chunk as any).toolCallId,
                      result: (chunk as any).result,
                    });

                    // Don't add tool results to accumulated content
                    // The model will incorporate them into its response text
                    break;
                  }

                  case 'finish': {
                    // Send completion events
                    const contentBlockStop = { type: 'content_block_stop', index: 0 };
                    controller.enqueue(
                      encoder.encode(
                        `event: content_block_stop\ndata: ${JSON.stringify(contentBlockStop)}\n\n`
                      )
                    );

                    outputTokens =
                      'usage' in chunk &&
                      chunk.usage &&
                      typeof chunk.usage === 'object' &&
                      'outputTokens' in chunk.usage
                        ? (chunk.usage as any).outputTokens || 0
                        : 0;

                    // Also check for inputTokens in the finish chunk
                    inputTokens =
                      'usage' in chunk &&
                      chunk.usage &&
                      typeof chunk.usage === 'object' &&
                      'inputTokens' in chunk.usage
                        ? (chunk.usage as any).inputTokens || 0
                        : 0;

                    const messageDelta = {
                      type: 'message_delta',
                      delta: { stop_reason: 'end_turn', stop_sequence: null },
                      usage: { output_tokens: outputTokens },
                    };
                    controller.enqueue(
                      encoder.encode(
                        `event: message_delta\ndata: ${JSON.stringify(messageDelta)}\n\n`
                      )
                    );

                    const messageStop = { type: 'message_stop' };
                    controller.enqueue(
                      encoder.encode(
                        `event: message_stop\ndata: ${JSON.stringify(messageStop)}\n\n`
                      )
                    );

                    // Update the interaction with the complete response
                    if (interaction && accumulatedContent) {
                      const { updateAiInteraction } = await import(
                        '../../../lib/services/message-logger'
                      );
                      await updateAiInteraction({
                        interactionId: interaction.id,
                        response: {
                          id,
                          type: 'message' as const,
                          role: 'assistant' as const,
                          content: [
                            {
                              type: 'text' as const,
                              text: accumulatedContent,
                            },
                          ],
                          model: finalModelName,
                          stop_reason: 'end_turn' as const,
                          stop_sequence: null,
                          usage: {
                            input_tokens: inputTokens,
                            output_tokens: outputTokens,
                          },
                        },
                        additionalTokens: {
                          promptTokens: inputTokens,
                          completionTokens: outputTokens,
                          totalTokens: inputTokens + outputTokens,
                        },
                      });
                      logger.debug('Updated interaction with complete response', {
                        interactionId: interaction.id,
                        contentLength: accumulatedContent.length,
                        tokens: { input: inputTokens, output: outputTokens },
                      });
                    }

                    controller.close();
                    break;
                  }

                  case 'error': {
                    const errorData = {
                      type: 'error',
                      error: {
                        type: 'api_error',
                        message: typeof chunk.error === 'string' ? chunk.error : 'Streaming error',
                      },
                    };
                    controller.enqueue(
                      encoder.encode(`event: error\ndata: ${JSON.stringify(errorData)}\n\n`)
                    );
                    controller.close();
                    break;
                  }

                  // Log unknown chunk types for debugging
                  default:
                    logger.debug('Unknown chunk type received', {
                      type: chunk.type,
                      chunk: JSON.stringify(chunk).substring(0, 200),
                    });
                    break;
                }
              }
            } finally {
              reader.releaseLock();
            }
          } catch (error) {
            const errorData = {
              type: 'error',
              error: {
                type: 'api_error',
                message: error instanceof Error ? error.message : 'Streaming error',
              },
            };
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify(errorData)}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Response-Time': `${responseTime}ms`,
          ...CORS_HEADERS,
        },
      });
    } else {
      // Generate standard response using AI service
      const { response, providerId } = await AIService.generateCompletion(requestData!);
      const responseTime = Date.now() - startTime;

      // Log successful interaction to database
      await logAiInteraction({
        request: requestData!,
        response,
        responseTime,
        statusCode: 200,
        providerId,
      });

      // Log API request
      await logApiRequest({
        request,
        statusCode: 200,
        responseTime,
        responseSize: JSON.stringify(response).length,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`,
          ...CORS_HEADERS,
        },
      });
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log errors appropriately based on type
    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('invalid x-api-key')) {
        logger.debug('Authentication error (expected when no API key configured)', error.message);
      } else {
        logger.error('API endpoint error:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
    } else {
      logger.error('Unknown error:', error);
    }

    // Determine status code based on error type
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      // Handle various configuration issues
      if (
        error.message.includes('No AI provider configured') ||
        error.message.includes('invalid x-api-key') ||
        error.message.includes('authentication') ||
        error.message.includes('credit balance')
      ) {
        statusCode = 503;
        errorMessage = error.message.includes('credit balance')
          ? error.message
          : 'AI provider not configured. Please contact administrator.';
      }
    }

    // Log failed interaction to database (if we have request data)
    if (requestData) {
      // Try to get provider ID for error logging - use default provider if available
      let errorProviderId: string | undefined;
      try {
        const { ProviderManager } = await import('../../../lib/ai/provider-manager');
        const defaultProvider = await ProviderManager.getDefaultProvider();
        errorProviderId = defaultProvider?.id;
      } catch {
        // Ignore errors getting provider for error logging
      }

      await logAiInteraction({
        request: requestData,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
        statusCode,
        providerId: errorProviderId,
      });
    }

    // Log API request
    await logApiRequest({
      request,
      statusCode,
      responseTime,
    });

    // Return appropriate error response
    if (statusCode === 503) {
      return createErrorResponse(API_ERROR_TYPES.PERMISSION_ERROR, errorMessage, 503);
    }

    return createErrorResponse(API_ERROR_TYPES.API_ERROR, 'Internal server error', 500);
  }
};
