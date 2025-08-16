import type { APIRoute } from 'astro';
import { broker } from '../../../lib/realtime/broker.js';
import type { RealtimeEvent } from '../../../lib/realtime/types.js';
import { getSSEConfig, formatSSEMessage, createHeartbeatMessage } from '../../../lib/sse/config.js';

/**
 * Server-Sent Events endpoint for real-time message notifications.
 *
 * Features:
 * - Proper SSE headers and connection management
 * - Last-Event-ID support for reconnection resilience
 * - Heartbeat mechanism to detect stale connections
 * - Automatic cleanup of abandoned connections
 *
 * @returns SSE stream with message:created events
 */
export const GET: APIRoute = async ({ request }) => {
  // Get SSE configuration
  const config = getSSEConfig();

  // Extract Last-Event-ID header for resuming from a specific point
  const lastEventId =
    request.headers.get('Last-Event-ID') ||
    new globalThis.URL(request.url).searchParams.get('lastEventId');

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // SSE connection state
      let isConnected = true;
      // eslint-disable-next-line prefer-const
      let heartbeatInterval: ReturnType<typeof globalThis.setInterval> | undefined;
      let connectionTimeout: ReturnType<typeof globalThis.setTimeout> | undefined;

      /**
       * Send an SSE message with proper formatting.
       */
      const sendSSE = (data: string | object, eventType?: string, id?: string) => {
        if (!isConnected) return;

        try {
          const message = formatSSEMessage(data, eventType, id);
          controller.enqueue(new TextEncoder().encode(message));

          // Reset connection timeout on activity
          if (connectionTimeout) {
            globalThis.clearTimeout(connectionTimeout);
            connectionTimeout = globalThis.setTimeout(() => {
              if (config.debugMode) {
                console.error('SSE connection timeout, closing connection');
              }
              cleanup();
            }, config.connectionTimeout);
          }
        } catch (error) {
          if (config.debugMode) {
            console.error('SSE send error:', error);
          }
          cleanup();
        }
      };

      /**
       * Clean up resources and close the connection.
       */
      const cleanup = () => {
        isConnected = false;
        if (heartbeatInterval) globalThis.clearInterval(heartbeatInterval);
        if (connectionTimeout) globalThis.clearTimeout(connectionTimeout);
        if (unsubscribe) unsubscribe();

        try {
          controller.close();
        } catch (_error) {
          // Connection may already be closed
        }
      };

      /**
       * Handle incoming realtime events from the broker.
       */
      const handleRealtimeEvent = (event: RealtimeEvent) => {
        if (!isConnected) return;

        // Serialize the event data for SSE transmission
        const serializedData =
          event.data && typeof event.data === 'object'
            ? (() => {
                const dataObj = event.data as Record<string, unknown>;
                const serialized: Record<string, unknown> = { ...dataObj };

                // Ensure createdAt is serialized if present
                if ('createdAt' in dataObj && dataObj.createdAt instanceof Date) {
                  serialized.createdAt = dataObj.createdAt.toISOString();
                }

                return serialized;
              })()
            : event.data;

        const eventData = {
          id: event.id,
          type: event.type,
          createdAt: event.createdAt.toISOString(),
          data: serializedData,
        };

        sendSSE(eventData, event.type, event.id);
      };

      // Send initial connection confirmation with retry interval
      const connectedMessage = formatSSEMessage(
        {
          type: 'connected',
          timestamp: new Date().toISOString(),
          message: 'SSE connection established',
        },
        'connected',
        undefined,
        config.retryInterval
      );
      controller.enqueue(new TextEncoder().encode(connectedMessage));

      // If client provided Last-Event-ID, replay missed events
      if (lastEventId) {
        const missedEvents = broker.getEventsSince(lastEventId);
        const eventsToReplay = missedEvents.slice(0, config.maxReplayEvents);

        if (config.debugMode && missedEvents.length > config.maxReplayEvents) {
          console.warn(
            `Replaying ${config.maxReplayEvents} of ${missedEvents.length} missed events`
          );
        }

        for (const event of eventsToReplay) {
          handleRealtimeEvent(event);
        }
      }

      // Subscribe to future realtime events
      const unsubscribeCreated = broker.subscribe('message:created', handleRealtimeEvent);
      const unsubscribeUpdated = broker.subscribe('message:updated', handleRealtimeEvent);

      const unsubscribe = () => {
        unsubscribeCreated();
        unsubscribeUpdated();
      };

      // Set up heartbeat to detect stale connections
      heartbeatInterval = globalThis.setInterval(() => {
        if (!isConnected) return;

        try {
          // Check if controller is closed before writing
          if (controller.desiredSize === null) {
            cleanup();
            return;
          }

          const heartbeat = createHeartbeatMessage();
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch (error) {
          if (config.debugMode) {
            console.error('Heartbeat error:', error);
          }
          cleanup();
        }
      }, config.heartbeatInterval);

      // Set up connection timeout
      connectionTimeout = globalThis.setTimeout(() => {
        if (config.debugMode) {
          console.error('SSE initial connection timeout, closing connection');
        }
        cleanup();
      }, config.connectionTimeout);

      // Handle client disconnect
      const abortController = new AbortController();
      request.signal?.addEventListener(
        'abort',
        () => {
          cleanup();
        },
        { signal: abortController.signal }
      );

      // Store cleanup for potential manual cleanup
      (controller as unknown as Record<string, unknown>).cleanup = cleanup;
    },

    cancel() {
      // Called when the stream is cancelled/closed
      if ((this as Record<string, unknown>).cleanup) {
        ((this as Record<string, unknown>).cleanup as () => void)();
      }
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
      'Access-Control-Allow-Methods': 'GET',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering for SSE
    },
  });
};
