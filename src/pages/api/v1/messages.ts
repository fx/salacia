import type { APIRoute } from 'astro';
import { AnthropicRequestSchema } from '../../../lib/ai/types';
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

  try {
    // Validate headers
    const headerValidation = validateHeaders(request);
    if (!headerValidation.isValid) {
      return headerValidation.error!;
    }

    // Parse and validate request body
    const { data: requestData, error: parseError } = await parseRequestBody(request, data => {
      // Only log a summary in debug mode - full requests are too verbose
      if (data && typeof data === 'object' && 'model' in data) {
        const summary = {
          model: data.model,
          messageCount: Array.isArray(data.messages) ? data.messages.length : 0,
          maxTokens: data.max_tokens || 'default',
          hasSystem: !!data.system,
        };
        logger.debug('Request summary:', summary);
      }
      return AnthropicRequestSchema.parse(data);
    });

    if (parseError) {
      return parseError;
    }

    // Check if streaming is requested
    const isStreaming = requestData!.stream === true;

    if (isStreaming) {
      // Generate streaming response using AI service
      const stream = await AIService.generateStreamingCompletion(requestData!);

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Response-Time': `${Date.now() - startTime}ms`,
          ...CORS_HEADERS,
        },
      });
    } else {
      // Generate standard response using AI service
      const response = await AIService.generateCompletion(requestData!);
      const responseTime = Date.now() - startTime;

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
    // Log errors appropriately based on type
    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('invalid x-api-key')) {
        logger.debug('Authentication error (expected when no API key configured)', error.message);
      } else {
        logger.error('API endpoint error:', error);
      }
    } else {
      logger.error('Unknown error:', error);
    }

    // Return appropriate error response
    if (error instanceof Error) {
      // Handle various configuration issues
      if (
        error.message.includes('No AI provider configured') ||
        error.message.includes('invalid x-api-key') ||
        error.message.includes('authentication')
      ) {
        return createErrorResponse(
          API_ERROR_TYPES.PERMISSION_ERROR,
          'AI provider not configured. Please contact administrator.',
          503
        );
      }
    }

    return createErrorResponse(API_ERROR_TYPES.API_ERROR, 'Internal server error', 500);
  }
};
