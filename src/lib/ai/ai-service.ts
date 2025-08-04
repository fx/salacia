import { generateText } from 'ai';
import { ProviderManager } from './provider-manager';
import { ProviderFactory } from './provider-factory';
import { db } from '../db';
import { aiInteractions } from '../db/schema';
import type { AnthropicRequest, AnthropicResponse, AIProviderType } from './types';
import type { AiProvider } from '../db/schema';
import { generateMessageId, estimateTokens } from './api-utils';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIService');

/**
 * AI service for handling chat completions with real providers
 *
 * This service integrates with the Vercel AI SDK to provide
 * unified access to multiple AI providers while maintaining
 * Anthropic API compatibility.
 */
export class AIService {
  /**
   * Generate a chat completion using the configured provider
   */
  static async generateCompletion(
    request: AnthropicRequest,
    provider?: AiProvider
  ): Promise<AnthropicResponse> {
    const startTime = Date.now();
    let selectedProvider = provider;

    try {
      // Get provider if not provided
      if (!selectedProvider) {
        selectedProvider = await ProviderManager.ensureDefaultProvider();
      }

      // Create AI SDK client
      const client = ProviderManager.createClient(selectedProvider);
      const model = client(this.mapModelName(selectedProvider, request.model));

      // Convert Anthropic format to AI SDK format
      const messages = this.convertAnthropicMessages(request);

      // Generate response
      const generateOptions: Parameters<typeof generateText>[0] = {
        model,
        messages,
        temperature: request.temperature,
        topP: request.top_p,
      };

      // Add maxTokens if provided
      if (request.max_tokens) {
        (generateOptions as Parameters<typeof generateText>[0] & { maxTokens?: number }).maxTokens =
          request.max_tokens;
      }

      const result = await generateText(generateOptions);

      // Convert response back to Anthropic format
      const response: AnthropicResponse = {
        id: generateMessageId(),
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: result.text,
          },
        ],
        model: request.model,
        stop_reason: this.mapFinishReason(result.finishReason),
        stop_sequence: null,
        usage: {
          input_tokens: estimateTokens(request.messages),
          output_tokens: this.estimateOutputTokens(result.text),
        },
      };

      // Log interaction
      const responseTime = Date.now() - startTime;
      await this.logInteraction(selectedProvider, request, response, responseTime, null);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log error
      if (selectedProvider) {
        await this.logInteraction(selectedProvider, request, null, responseTime, errorMessage);
      }

      throw error;
    }
  }

  /**
   * Generate a streaming chat completion
   * For now, simulate streaming by chunking a regular response
   */
  static async generateStreamingCompletion(
    request: AnthropicRequest,
    provider?: AiProvider
  ): Promise<ReadableStream> {
    // For now, generate a regular completion and simulate streaming
    const response = await this.generateCompletion(request, provider);

    // Create a streaming response that chunks the text
    return this.createSimulatedStream(response);
  }

  /**
   * Create a simulated streaming response from a complete response
   */
  private static createSimulatedStream(response: AnthropicResponse): ReadableStream {
    const encoder = new TextEncoder();

    return new ReadableStream({
      start(controller) {
        // Send message_start event
        const messageStart = {
          type: 'message_start',
          message: {
            id: response.id,
            type: response.type,
            role: response.role,
            content: [],
            model: response.model,
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: response.usage.input_tokens, output_tokens: 0 },
          },
        };
        controller.enqueue(
          encoder.encode(`event: message_start\ndata: ${JSON.stringify(messageStart)}\n\n`)
        );

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

        // Send content in chunks
        const text = response.content[0].text;
        const words = text.split(' ');
        let currentIndex = 0;

        const sendNextChunk = () => {
          if (currentIndex >= words.length) {
            // Send final events
            const contentBlockStop = { type: 'content_block_stop', index: 0 };
            controller.enqueue(
              encoder.encode(
                `event: content_block_stop\ndata: ${JSON.stringify(contentBlockStop)}\n\n`
              )
            );

            const messageDelta = {
              type: 'message_delta',
              delta: { stop_reason: response.stop_reason, stop_sequence: response.stop_sequence },
              usage: { output_tokens: response.usage.output_tokens },
            };
            controller.enqueue(
              encoder.encode(`event: message_delta\ndata: ${JSON.stringify(messageDelta)}\n\n`)
            );

            const messageStop = { type: 'message_stop' };
            controller.enqueue(
              encoder.encode(`event: message_stop\ndata: ${JSON.stringify(messageStop)}\n\n`)
            );

            controller.close();
            return;
          }

          const word = words[currentIndex];
          const delta = {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: currentIndex === 0 ? word : ` ${word}` },
          };
          controller.enqueue(
            encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify(delta)}\n\n`)
          );

          currentIndex++;
          setTimeout(sendNextChunk, 100); // 100ms delay between words
        };

        // Start sending chunks
        sendNextChunk();
      },
    });
  }

  /**
   * Convert Anthropic messages to AI SDK format
   */
  private static convertAnthropicMessages(request: AnthropicRequest) {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system message if provided
    if (request.system) {
      let systemContent: string;
      if (typeof request.system === 'string') {
        systemContent = request.system;
      } else if (Array.isArray(request.system)) {
        // Extract text from array format (Claude Code sends it as an array)
        systemContent = request.system
          .filter(block => block.type === 'text')
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
    for (const message of request.messages) {
      let content: string;

      if (typeof message.content === 'string') {
        content = message.content;
      } else if (Array.isArray(message.content)) {
        // Handle multimodal content - for now, just extract text
        content = message.content
          .filter(block => block.type === 'text' && 'text' in block)
          .map(block => ('text' in block ? block.text! : ''))
          .join('\n');
      } else {
        content = '';
      }

      const role = message.role as 'system' | 'user' | 'assistant';
      messages.push({ role, content });
    }

    return messages;
  }

  /**
   * Map model names between Anthropic and provider-specific formats
   */
  private static mapModelName(provider: AiProvider, modelName: string): string {
    // If it's an Anthropic provider, use the model name as-is
    if (provider.type === 'anthropic') {
      return modelName;
    }

    // For other providers, use the factory's model mapping
    const factoryMappedModel = ProviderFactory.mapModelName(
      provider.type as AIProviderType,
      modelName
    );
    return factoryMappedModel;
  }

  /**
   * Map AI SDK finish reasons to Anthropic format
   */
  private static mapFinishReason(
    finishReason: string | undefined
  ): 'end_turn' | 'max_tokens' | 'stop_sequence' {
    switch (finishReason) {
      case 'stop':
        return 'end_turn';
      case 'length':
        return 'max_tokens';
      case 'content_filter':
      case 'function_call':
      case 'tool_calls':
        return 'stop_sequence';
      default:
        return 'end_turn';
    }
  }

  /**
   * Estimate output tokens from text (rough approximation)
   */
  private static estimateOutputTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Log interaction to database
   */
  private static async logInteraction(
    provider: AiProvider,
    request: AnthropicRequest,
    response: AnthropicResponse | null,
    responseTime: number,
    error: string | null
  ): Promise<void> {
    try {
      await db.insert(aiInteractions).values({
        providerId: provider.id.startsWith('env-') ? null : provider.id, // Don't store env provider IDs
        model: request.model,
        request,
        response,
        promptTokens: response?.usage.input_tokens || estimateTokens(request.messages),
        completionTokens: response?.usage.output_tokens || null,
        totalTokens: response ? response.usage.input_tokens + response.usage.output_tokens : null,
        responseTimeMs: responseTime,
        statusCode: error ? 500 : 200,
        error,
      });
    } catch (dbError) {
      logger.warn('Failed to log interaction:', dbError);
      // Don't throw - logging failures shouldn't break the API
    }
  }
}
