import type { APIRoute } from 'astro';
import { MessagesService } from '../../../lib/services/messages.js';
import { createLogger } from '../../../lib/utils/logger.js';
import {
  classifyMessagesServiceError,
  createErrorResponse,
  NotFoundError,
  ValidationError,
} from '../../../lib/errors/api-errors.js';

const logger = createLogger('API/Messages/ID');

/**
 * Individual message API endpoint for retrieving a single AI interaction by ID.
 *
 * This endpoint provides detailed access to a specific message including:
 * - Complete message metadata (model, provider, timestamps, tokens, etc.)
 * - Full request and response data
 * - Error information if applicable
 * - Success/failure status
 *
 * Path Parameters:
 * - id: UUID of the message to retrieve
 *
 * @returns JSON response with message details or error
 */
export const GET: APIRoute = async ({ params }) => {
  const startTime = Date.now();
  const messageId = params.id;

  try {
    // Validate that ID parameter is present
    if (!messageId) {
      const responseTime = Date.now() - startTime;

      const validationError = new ValidationError('Message ID is required');
      return createErrorResponse(validationError, responseTime);
    }

    logger.debug('Fetching message by ID:', { messageId });

    // Fetch the message using the service layer
    const message = await MessagesService.getMessageById(messageId);

    const responseTime = Date.now() - startTime;

    // Handle message not found
    if (!message) {
      logger.debug('Message not found:', { messageId });

      const notFoundError = new NotFoundError('Message', messageId);
      return createErrorResponse(notFoundError, responseTime);
    }

    logger.debug('Message retrieved successfully:', {
      messageId,
      model: message.model,
      isSuccess: message.isSuccess,
      responseTime,
    });

    return new Response(JSON.stringify(message), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Message API error:', { messageId, error });

    // Classify the error and create appropriate response
    const apiError = classifyMessagesServiceError(error, `retrieve message ${messageId}`);
    return createErrorResponse(apiError, responseTime);
  }
};
