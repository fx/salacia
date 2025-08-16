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
import { createTrackingStream } from '../../../lib/ai/streaming-tracker';

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
      (globalThis as unknown as { __claudeCodeToken?: string }).__claudeCodeToken = authHeader.substring(7);

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
          const summary = {
            model: data.model,
            messageCount: hasMessages ? (data as { messages: unknown[] }).messages.length : 0,
            maxTokens: hasMaxTokens ? data.max_tokens : 'default',
            hasSystem: hasSystem,
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
      // Generate streaming response using AI service
      const { stream, providerId } = await AIService.generateStreamingCompletion(requestData!);
      const responseTime = Date.now() - startTime;

      // Log streaming request - create initial database record
      const interaction = await logAiInteraction({
        request: requestData!,
        response: undefined, // Response will be updated when stream completes
        responseTime,
        statusCode: 200,
        providerId,
      });

      // Log API request
      await logApiRequest({
        request,
        statusCode: 200,
        responseTime,
      });

      // Wrap stream with tracking to update database when complete
      const trackingStream = interaction 
        ? createTrackingStream(stream, interaction.id)
        : stream;

      return new Response(trackingStream, {
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
