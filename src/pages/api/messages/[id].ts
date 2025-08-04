import type { APIRoute } from 'astro';
import { MessagesService } from '../../../lib/services/messages.js';
import { createLogger } from '../../../lib/utils/logger.js';

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
      
      return new Response(
        JSON.stringify({
          error: 'Missing parameter',
          message: 'Message ID is required',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': `${responseTime}ms`,
          },
        }
      );
    }

    logger.debug('Fetching message by ID:', { messageId });

    // Fetch the message using the service layer
    const message = await MessagesService.getMessageById(messageId);
    
    const responseTime = Date.now() - startTime;

    // Handle message not found
    if (!message) {
      logger.debug('Message not found:', { messageId });
      
      return new Response(
        JSON.stringify({
          error: 'Message not found',
          message: `No message found with ID: ${messageId}`,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': `${responseTime}ms`,
          },
        }
      );
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

    // Handle specific error types
    if (error instanceof Error) {
      // Invalid UUID format errors
      if (error.message.includes('Invalid UUID format')) {
        return new Response(
          JSON.stringify({
            error: 'Invalid message ID',
            message: 'The provided message ID is not a valid UUID format',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'X-Response-Time': `${responseTime}ms`,
            },
          }
        );
      }

      // Database connection errors
      if (error.message.includes('database') || error.message.includes('connection')) {
        return new Response(
          JSON.stringify({
            error: 'Database error',
            message: 'Unable to retrieve message at this time',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'X-Response-Time': `${responseTime}ms`,
            },
          }
        );
      }
    }

    // Generic server error
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );
  }
};