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
        const mappedModelId = ProviderFactory.mapModelName(provider.type as 'openai' | 'anthropic' | 'groq', requestData!.model);
        
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

          const role = message.role as 'system' | 'user' | 'assistant';
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

        // Use AI SDK's streamText method
        const { streamText } = await import('ai');
        logger.debug('Calling AI SDK streamText with model', { modelType: typeof model, provider: provider.type });
        result = await streamText({
          model: model as any, // Type assertion needed due to SDK version differences
          messages: prompt,
          ...(requestData!.max_tokens && { maxTokens: requestData!.max_tokens }),
          ...(requestData!.temperature && { temperature: requestData!.temperature }),
          ...(requestData!.top_p && { topP: requestData!.top_p }),
        });
        logger.debug('AI SDK streamText returned', { hasFullStream: !!result.fullStream });
      }

      const responseTime = Date.now() - startTime;

      // Log streaming request - create initial database record
      const _interaction = await logAiInteraction({
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

                  case 'finish': {
                    // Send completion events
                    const contentBlockStop = { type: 'content_block_stop', index: 0 };
                    controller.enqueue(
                      encoder.encode(
                        `event: content_block_stop\ndata: ${JSON.stringify(contentBlockStop)}\n\n`
                      )
                    );

                    const outputTokens =
                      'usage' in chunk &&
                      chunk.usage &&
                      typeof chunk.usage === 'object' &&
                      'outputTokens' in chunk.usage
                        ? (chunk.usage as any).outputTokens || 0
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

                  // Ignore other chunk types like OpenCode does
                  default:
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
