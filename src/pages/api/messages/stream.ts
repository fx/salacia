import type { APIRoute } from 'astro';
import type { SSEEvent, SSEConnectionEvent, SSEHeartbeatEvent } from '../../../lib/types/sse.js';
import { createLogger } from '../../../lib/utils/logger.js';

const logger = createLogger('API/Messages/Stream');

// Global connection tracking
const connections = new Map<
  string,
  {
    lastHeartbeat: Date;
    abortController: AbortController;
  }
>();

/**
 * Validates if the request origin is allowed for CORS.
 */
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  // Allow localhost for development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }

  // Add your production domains here
  const allowedOrigins = [
    // 'https://yourdomain.com',
    // 'https://www.yourdomain.com'
  ];

  return allowedOrigins.includes(origin);
};

/**
 * Server-Sent Events endpoint for real-time message updates.
 *
 * Provides persistent HTTP connection for streaming real-time updates
 * about AI message interactions with connection management and heartbeats.
 *
 * @returns EventSource-compatible SSE stream
 */
export const GET: APIRoute = async ({ url, request }) => {
  // Generate connection ID
  const connectionId = `sse_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Parse heartbeat interval (default 30s, max 5 minutes)
  const heartbeatInterval =
    Math.min(parseInt(url.searchParams.get('heartbeatInterval') || '30'), 300) * 1000;

  // Get request origin for CORS validation
  const requestOrigin = request.headers.get('origin');

  logger.info('SSE connection request:', {
    connectionId,
    heartbeatInterval,
    origin: requestOrigin,
  });

  // Create abort controller for cleanup
  const abortController = new AbortController();

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    logger.info('Client disconnected:', { connectionId });
    cleanup();
  });

  // Cleanup function
  const cleanup = () => {
    connections.delete(connectionId);
  };

  // Create SSE response stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Store connection for tracking
      connections.set(connectionId, {
        lastHeartbeat: new Date(),
        abortController,
      });

      /**
       * Sends an SSE event to the client with proper formatting.
       */
      const sendEvent = (event: SSEEvent) => {
        try {
          const eventData = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(eventData));

          // Update connection tracking
          const connection = connections.get(connectionId);
          if (connection) {
            connection.lastHeartbeat = new Date();
          }
        } catch (error) {
          logger.error('Error sending SSE event:', { connectionId, error });
        }
      };

      // Send connection opened event
      const connectionEvent: SSEConnectionEvent = {
        type: 'connection_opened',
        timestamp: new Date().toISOString(),
        id: `conn_${connectionId}`,
        data: {
          message: 'SSE connection established successfully',
        },
      };

      sendEvent(connectionEvent);

      // Setup heartbeat interval
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      heartbeatTimer = setInterval(() => {
        if (abortController.signal.aborted) {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          return;
        }

        const heartbeatEvent: SSEHeartbeatEvent = {
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          id: `heartbeat_${Date.now()}`,
          data: {
            serverTime: new Date().toISOString(),
            connectionId,
          },
        };

        sendEvent(heartbeatEvent);
      }, heartbeatInterval);

      // Cleanup on abort
      abortController.signal.addEventListener('abort', () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        controller.close();
      });

      logger.info('SSE connection established:', { connectionId });
    },

    cancel() {
      logger.info('SSE stream cancelled:', { connectionId });
      cleanup();
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      ...(isAllowedOrigin(requestOrigin) ? { 'Access-Control-Allow-Origin': requestOrigin! } : {}),
      'X-Connection-Id': connectionId,
    },
  });
};
