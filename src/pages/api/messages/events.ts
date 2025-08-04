import type { APIRoute } from 'astro';
import { MessagesService } from '../../../lib/services/messages.js';
import { createLogger } from '../../../lib/utils/logger.js';

const logger = createLogger('API/Messages/Events');

/**
 * Server-Sent Events endpoint for real-time message updates.
 * 
 * This endpoint establishes a persistent connection to stream real-time updates
 * about AI interaction messages, including new messages and status changes.
 * 
 * The client should connect using EventSource and listen for the following event types:
 * - 'message': New message added or updated
 * - 'status': Message status change (in-flight -> completed/error)
 * - 'heartbeat': Keep-alive ping every 30 seconds
 * 
 * @returns Server-Sent Events stream
 */
export const GET: APIRoute = async ({ request }) => {
  logger.debug('SSE connection initiated');

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      logger.debug('SSE stream started');

      // Send initial connection event
      const initMessage = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Real-time connection established'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initMessage));

      // Set up heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch (error) {
          logger.debug('Heartbeat failed, closing connection:', error);
          clearInterval(heartbeatInterval);
          controller.close();
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Set up message polling for updates
      // In a production environment, this would be replaced with database triggers
      // or message queue subscriptions for true real-time updates
      let lastCheck = new Date();
      const pollInterval = setInterval(async () => {
        try {
          // Check for new messages since last poll
          const result = await MessagesService.getMessages(
            { page: 1, pageSize: 10 },
            { startDate: lastCheck.toISOString().split('T')[0] }
          );

          // Send updates for any new messages
          for (const message of result.messages) {
            if (new Date(message.createdAt) > lastCheck) {
              const updateMessage = `data: ${JSON.stringify({
                type: 'message',
                timestamp: new Date().toISOString(),
                data: {
                  id: message.id,
                  model: message.model,
                  provider: message.provider,
                  createdAt: message.createdAt,
                  isSuccess: message.isSuccess,
                  totalTokens: message.totalTokens,
                  responseTime: message.responseTime,
                  requestPreview: message.requestPreview,
                  status: message.responseTime ? 'completed' : 'in-flight'
                }
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(updateMessage));
            }
          }

          lastCheck = new Date();
        } catch (error) {
          logger.error('Error polling for message updates:', error);
          const errorMessage = `data: ${JSON.stringify({
            type: 'error',
            timestamp: new Date().toISOString(),
            message: 'Error checking for updates'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorMessage));
        }
      }, 2000); // Poll every 2 seconds

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        logger.debug('SSE client disconnected');
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
        controller.close();
      });
    }
  });

  return new Response(stream, { headers });
};