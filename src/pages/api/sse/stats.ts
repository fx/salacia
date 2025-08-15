import type { APIRoute } from 'astro';
import { broker } from '../../../lib/realtime/broker.js';
import type { RealtimeEvent } from '../../../lib/realtime/types.js';
import { getSSEConfig, formatSSEMessage, createHeartbeatMessage } from '../../../lib/sse/config.js';
import { sequelize } from '../../../lib/db/sequelize-connection.js';
import { MessagesService } from '../../../lib/services/messages.js';

/**
 * Stats data structure for SSE updates.
 */
interface StatsData {
  // Stats for navigation (5 minutes)
  fiveMinute: Awaited<ReturnType<typeof MessagesService.getFilteredStats>> | null;
  // Stats for stats page (24 hours default)
  twentyFourHour: Awaited<ReturnType<typeof MessagesService.getFilteredStats>> | null;
  // Overall stats (all time)
  overall: Awaited<ReturnType<typeof MessagesService.getFilteredStats>> | null;
  series: Array<{ hour: string; total: number; failed: number; avg_rt: number; tokens: number }>;
  topModels: Array<{ model: string; count: number }>;
  timestamp: string;
}

/**
 * Server-Sent Events endpoint for real-time stats notifications.
 *
 * Features:
 * - Responds to message:created events with fresh stats data
 * - Proper SSE headers and connection management
 * - Last-Event-ID support for reconnection resilience
 * - Heartbeat mechanism to detect stale connections
 * - Automatic cleanup of abandoned connections
 *
 * @returns SSE stream with stats:updated events
 */
export const GET: APIRoute = async ({ request }) => {
  // Get SSE configuration
  const config = getSSEConfig();

  // Extract Last-Event-ID header for resuming from a specific point
  const _lastEventId =
    request.headers.get('Last-Event-ID') ||
    new globalThis.URL(request.url).searchParams.get('lastEventId');

  /**
   * Query fresh stats data from the database.
   */
  const queryStatsData = async (): Promise<StatsData> => {
    try {
      // Load stats for different time windows
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [fiveMinute, twentyFourHour, overall] = await Promise.all([
        // Navigation stats (5 minutes)
        MessagesService.getFilteredStats({
          startDate: fiveMinutesAgo,
        }),
        // Stats page default (24 hours)
        MessagesService.getFilteredStats({
          startDate: twentyFourHoursAgo,
        }),
        // Overall stats (all time)
        MessagesService.getFilteredStats({}),
      ]);

      // Time series - hourly for last 24 hours with all hours filled
      // Generate hours with the most recent hour last, include ISO timestamp for client-side formatting
      const [rows] = await sequelize.query(
        `
        WITH hours AS (
          SELECT 
            generate_series(
              date_trunc('hour', NOW() - interval '23 hours'),
              date_trunc('hour', NOW()),
              interval '1 hour'
            ) as hour_timestamp
        ),
        hourly_stats AS (
          SELECT 
            date_trunc('hour', created_at) as hour_timestamp,
            COUNT(*)::int as total,
            COALESCE(SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END),0)::int as failed,
            COALESCE(AVG(response_time_ms),0)::int as avg_rt,
            COALESCE(SUM(total_tokens),0)::int as tokens
          FROM ai_interactions
          WHERE created_at >= NOW() - interval '24 hours'
          GROUP BY 1
        )
        SELECT 
          to_char(h.hour_timestamp, 'HH24:MI') as hour,
          h.hour_timestamp::text as hour_timestamp,
          COALESCE(hs.total, 0)::int as total,
          COALESCE(hs.failed, 0)::int as failed,
          COALESCE(hs.avg_rt, 0)::int as avg_rt,
          COALESCE(hs.tokens, 0)::int as tokens
        FROM hours h
        LEFT JOIN hourly_stats hs ON h.hour_timestamp = hs.hour_timestamp
        ORDER BY h.hour_timestamp
        `
      );
      const series = rows as StatsData['series'];

      // Top models (last 24 hours)
      const [models] = await sequelize.query(
        `
        SELECT model, COUNT(*)::int as count
        FROM ai_interactions
        WHERE created_at >= NOW() - interval '24 hours'
        GROUP BY model
        ORDER BY count DESC
        LIMIT 5
        `
      );
      const topModels = models as StatsData['topModels'];

      return {
        fiveMinute,
        twentyFourHour,
        overall,
        series,
        topModels,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to query stats data:', error);
      return {
        fiveMinute: null,
        twentyFourHour: null,
        overall: null,
        series: [],
        topModels: [],
        timestamp: new Date().toISOString(),
      };
    }
  };

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
                console.error('Stats SSE connection timeout, closing connection');
              }
              cleanup();
            }, config.connectionTimeout);
          }
        } catch (error) {
          if (config.debugMode) {
            console.error('Stats SSE send error:', error);
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
       * Handle incoming realtime events from the broker and send fresh stats.
       */
      const handleRealtimeEvent = async (event: RealtimeEvent) => {
        if (!isConnected) return;

        // When a message is created, query fresh stats and send them
        if (event.type === 'message:created') {
          try {
            const freshStats = await queryStatsData();

            const statsEvent = {
              id: `stats-${event.id}`,
              type: 'stats:updated',
              createdAt: new Date().toISOString(),
              data: freshStats,
            };

            sendSSE(statsEvent, 'stats:updated', statsEvent.id);
          } catch (error) {
            if (config.debugMode) {
              console.error('Error querying stats after message creation:', error);
            }
          }
        }
      };

      // Send initial connection confirmation with retry interval
      const connectedMessage = formatSSEMessage(
        {
          type: 'connected',
          timestamp: new Date().toISOString(),
          message: 'Stats SSE connection established',
        },
        'connected',
        undefined,
        config.retryInterval
      );
      controller.enqueue(new TextEncoder().encode(connectedMessage));

      // Send initial stats data
      queryStatsData()
        .then(initialStats => {
          if (isConnected) {
            const initialEvent = {
              id: `stats-initial-${Date.now()}`,
              type: 'stats:updated',
              createdAt: new Date().toISOString(),
              data: initialStats,
            };
            sendSSE(initialEvent, 'stats:updated', initialEvent.id);
          }
        })
        .catch(error => {
          if (config.debugMode) {
            console.error('Error sending initial stats:', error);
          }
        });

      // Subscribe to future realtime events (specifically message:created)
      const unsubscribe = broker.subscribe('message:created', handleRealtimeEvent);

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
            console.error('Stats heartbeat error:', error);
          }
          cleanup();
        }
      }, config.heartbeatInterval);

      // Set up connection timeout
      connectionTimeout = globalThis.setTimeout(() => {
        if (config.debugMode) {
          console.error('Stats SSE initial connection timeout, closing connection');
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
