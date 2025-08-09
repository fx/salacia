/**
 * React hook for managing Server-Sent Events (SSE) connection specifically for stats updates.
 * Listens for stats:updated events and provides parsed stats data to components.
 *
 * @returns Object containing connection state, stats data, and control functions
 *
 * @example
 * ```tsx
 * const { connectionState, statsData, isConnected, connect, disconnect } = useStatsSSE();
 * ```
 *
 * @module useStatsSSE
 */

import { useState, useCallback, useEffect } from 'react';
import { useSSE } from './useSSE.js';
import type { SSEEvent } from './useSSE.js';
import type { MessageStats } from '../lib/types/messages.js';

/**
 * Statistics data structure from SSE updates.
 */
interface StatsData {
  overall: MessageStats | null;
  series: Array<{ day: string; total: number; failed: number; avg_rt: number; tokens: number }>;
  topModels: Array<{ model: string; count: number }>;
  timestamp: string;
}

/**
 * Stats SSE event structure.
 */
interface StatsSSEEvent extends SSEEvent {
  type: 'stats:updated' | 'connected' | 'heartbeat';
  data: StatsData;
}

/**
 * Custom hook for managing stats SSE connection and data.
 *
 * @param options - Configuration options (optional)
 * @returns Stats connection state, data, and control functions
 */
export function useStatsSSE(options: { autoConnect?: boolean } = {}) {
  const { autoConnect = true } = options;

  // Stats data state
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isInitialDataReceived, setIsInitialDataReceived] = useState(false);

  // Use base SSE hook
  const {
    connectionState,
    lastEventId,
    error,
    connect: baseConnect,
    disconnect: baseDsconnect,
    retry,
    addEventListener,
    addErrorListener,
    isConnected,
    isConnecting,
  } = useSSE('/api/sse/stats', {
    autoConnect,
    reconnect: true,
    reconnectDelay: 2000,
    maxReconnectAttempts: 10,
  });

  /**
   * Handle stats:updated events from SSE stream.
   */
  const handleStatsUpdate = useCallback(
    (event: SSEEvent) => {
      try {
        const statsEvent = event as StatsSSEEvent;

        if (statsEvent.data && typeof statsEvent.data === 'object') {
          setStatsData(statsEvent.data);
          setLastUpdate(new Date());

          if (!isInitialDataReceived) {
            setIsInitialDataReceived(true);
          }
        }
      } catch (error) {
        console.error('Error processing stats update:', error);
      }
    },
    [isInitialDataReceived]
  );

  /**
   * Handle connection events.
   */
  const handleConnected = useCallback((event: SSEEvent) => {
    // Connection established - could log to analytics service
    void event.data; // Acknowledge event parameter
  }, []);

  /**
   * Handle heartbeat events (for debugging/monitoring).
   */
  const handleHeartbeat = useCallback(() => {
    // Heartbeat received - connection is alive
    // Could update a "last heartbeat" timestamp if needed
  }, []);

  /**
   * Handle connection errors.
   */
  const handleError = useCallback((error: Error | globalThis.Event) => {
    console.error('Stats SSE error:', error);
  }, []);

  // Set up event listeners
  useEffect(() => {
    const unsubscribeStats = addEventListener('stats:updated', handleStatsUpdate);
    const unsubscribeConnected = addEventListener('connected', handleConnected);
    const unsubscribeHeartbeat = addEventListener('heartbeat', handleHeartbeat);
    const unsubscribeError = addErrorListener(handleError);

    return () => {
      unsubscribeStats();
      unsubscribeConnected();
      unsubscribeHeartbeat();
      unsubscribeError();
    };
  }, [
    addEventListener,
    addErrorListener,
    handleStatsUpdate,
    handleConnected,
    handleHeartbeat,
    handleError,
  ]);

  /**
   * Connect to stats SSE stream.
   */
  const connect = useCallback(() => {
    setIsInitialDataReceived(false);
    baseConnect();
  }, [baseConnect]);

  /**
   * Disconnect from stats SSE stream.
   */
  const disconnect = useCallback(() => {
    baseDsconnect();
    setStatsData(null);
    setLastUpdate(null);
    setIsInitialDataReceived(false);
  }, [baseDsconnect]);

  /**
   * Get stats data with safe defaults.
   */
  const getStatsData = useCallback((): StatsData => {
    return (
      statsData || {
        overall: null,
        series: [],
        topModels: [],
        timestamp: new Date().toISOString(),
      }
    );
  }, [statsData]);

  return {
    // Connection state
    connectionState,
    isConnected,
    isConnecting,
    lastEventId,
    error,

    // Stats data
    statsData: getStatsData(),
    lastUpdate,
    isInitialDataReceived,

    // Control functions
    connect,
    disconnect,
    retry,
  };
}

export default useStatsSSE;
