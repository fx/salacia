import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { aiInteractions } from '../../../lib/db/schema';
import { AnthropicRequestSchema, AnthropicResponseSchema } from '../../../lib/ai/types';
import type { AnthropicResponse } from '../../../lib/ai/types';
import {
  validateHeaders,
  parseRequestBody,
  createErrorResponse,
  API_ERROR_TYPES,
  generateMessageId,
  estimateTokens,
  handleOptions,
  CORS_HEADERS,
} from '../../../lib/ai/api-utils';

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

  try {
    // Validate headers
    const headerValidation = validateHeaders(request);
    if (!headerValidation.isValid) {
      return headerValidation.error!;
    }

    // Parse and validate request body
    const { data: requestData, error: parseError } = await parseRequestBody(request, data =>
      AnthropicRequestSchema.parse(data)
    );

    if (parseError) {
      return parseError;
    }

    // Check if streaming is requested
    const isStreaming = requestData!.stream === true;

    // For now, return a mock response until provider integration is complete
    const mockResponse: AnthropicResponse = {
      id: generateMessageId(),
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mock response from the Anthropic API compatibility layer. Provider integration coming soon.',
        },
      ],
      model: requestData!.model,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: estimateTokens(requestData!.messages),
        output_tokens: 25, // Mock token count for the response
      },
    };

    // Validate response format
    const validatedResponse = AnthropicResponseSchema.parse(mockResponse);

    // Log the interaction to database
    const responseTime = Date.now() - startTime;
    try {
      await db.insert(aiInteractions).values({
        providerId: null, // Will be set when provider integration is complete
        model: requestData!.model,
        request: requestData!,
        response: validatedResponse,
        promptTokens: validatedResponse.usage.input_tokens,
        completionTokens: validatedResponse.usage.output_tokens,
        totalTokens: validatedResponse.usage.input_tokens + validatedResponse.usage.output_tokens,
        responseTimeMs: responseTime,
        statusCode: 200,
      });
    } catch (dbError) {
      console.error('Failed to log interaction:', dbError);
      // Continue processing - don't fail the request due to logging issues
    }

    if (isStreaming) {
      // Return streaming response format
      return createStreamingResponse(validatedResponse);
    } else {
      // Return standard JSON response
      return new Response(JSON.stringify(validatedResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`,
          ...CORS_HEADERS,
        },
      });
    }
  } catch (error) {
    console.error('API endpoint error:', error);

    // Log error to database
    const responseTime = Date.now() - startTime;
    try {
      await db.insert(aiInteractions).values({
        providerId: null,
        model: 'unknown',
        request: { error: 'Failed to parse request' },
        response: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        responseTimeMs: responseTime,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (dbError) {
      console.error('Failed to log error:', dbError);
    }

    return createErrorResponse(API_ERROR_TYPES.API_ERROR, 'Internal server error', 500);
  }
};

/**
 * Create a Server-Sent Events streaming response
 */
function createStreamingResponse(response: AnthropicResponse): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
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
        encoder.encode(`event: content_block_start\ndata: ${JSON.stringify(contentBlockStart)}\n\n`)
      );

      // Send content_block_delta events (simulate streaming text)
      const text = response.content[0].text;
      const words = text.split(' ');

      // Process streaming with async delays
      let currentIndex = 0;
      const streamWords = () => {
        if (currentIndex >= words.length) return;

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

        if (currentIndex >= words.length) {
          // Send final events
          setTimeout(() => {
            // content_block_stop
            const contentBlockStop = { type: 'content_block_stop', index: 0 };
            controller.enqueue(
              encoder.encode(
                `event: content_block_stop\ndata: ${JSON.stringify(contentBlockStop)}\n\n`
              )
            );

            // message_delta with usage
            const messageDelta = {
              type: 'message_delta',
              delta: { stop_reason: response.stop_reason, stop_sequence: response.stop_sequence },
              usage: { output_tokens: response.usage.output_tokens },
            };
            controller.enqueue(
              encoder.encode(`event: message_delta\ndata: ${JSON.stringify(messageDelta)}\n\n`)
            );

            // message_stop
            const messageStop = { type: 'message_stop' };
            controller.enqueue(
              encoder.encode(`event: message_stop\ndata: ${JSON.stringify(messageStop)}\n\n`)
            );

            controller.close();
          }, 100);
        } else {
          setTimeout(streamWords, 100);
        }
      };

      // Start the streaming process
      streamWords();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    },
  });
}
