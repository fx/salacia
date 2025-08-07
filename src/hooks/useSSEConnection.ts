/**
 * React hook for managing Server-Sent Events (SSE) connections.
 *
 * Provides SSE client with basic reconnection and event handling.
 *
 * @example
 * ```tsx
 * const { connectionState, addEventListener } = useSSEConnection({
 *   url: '/api/messages/stream',
 *   autoReconnect: true,
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SSEConnectionConfig, SSEConnectionState, SSEEvent } from '../lib/types/sse.js';

/**
 * Hook for managing SSE connections.
 */
export function useSSEConnection(config: SSEConnectionConfig) {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const eventHandlersRef = useRef<Map<string, ((_event: SSEEvent) => void)[]>>(new Map());

  /**
   * Processes incoming SSE events and dispatches to registered handlers.
   */
  const handleSSEEvent = useCallback((event: MessageEvent) => {
    try {
      const sseEvent: SSEEvent = JSON.parse(event.data);

      // Update connection ID for both heartbeat and connection_opened events
      if (sseEvent.type === 'heartbeat') {
        setConnectionState(prev => ({
          ...prev,
          connectionId: sseEvent.data.connectionId,
        }));
      } else if (sseEvent.type === 'connection_opened') {
        // Connection opened events don't have connectionId in data, but we can extract from event
        setConnectionState(prev => ({
          ...prev,
          connectionId: sseEvent.id || prev.connectionId,
        }));
      }

      // Dispatch to event handlers
      const handlers = eventHandlersRef.current.get(sseEvent.type) || [];
      handlers.forEach(handler => {
        try {
          handler(sseEvent);
        } catch (error) {
          console.warn('Error in SSE event handler:', error);
        }
      });
    } catch (error) {
      console.error('Failed to parse SSE event:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        lastError: error instanceof Error ? error : new Error('Parse error'),
      }));
    }
  }, []);

  /**
   * Creates reconnection logic that avoids stale closures.
   */
  const createReconnectionHandler = useCallback(
    (currentConfig: SSEConnectionConfig) => {
      return () => {
        const error = new Error('SSE connection error');
        setConnectionState(prev => ({ ...prev, status: 'error', lastError: error }));

        if (currentConfig.autoReconnect) {
          const delay = currentConfig.reconnectDelay || 1000;
          const maxAttempts = currentConfig.maxReconnectAttempts;

          setTimeout(() => {
            setConnectionState(prev => {
              const shouldReconnect = !maxAttempts || prev.reconnectAttempts < maxAttempts;

              if (shouldReconnect) {
                const newAttempts = prev.reconnectAttempts + 1;

                // Schedule reconnection with fresh captured values
                setTimeout(() => {
                  if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                  }

                  setConnectionState(prev => ({ ...prev, status: 'connecting' }));

                  try {
                    const eventSource = new EventSource(currentConfig.url);
                    eventSourceRef.current = eventSource;

                    eventSource.onopen = () => {
                      setConnectionState(prev => ({
                        ...prev,
                        status: 'connected',
                        reconnectAttempts: 0,
                        lastError: undefined,
                      }));
                    };

                    eventSource.onmessage = handleSSEEvent;
                    eventSource.onerror = createReconnectionHandler(currentConfig);
                  } catch (reconnectError) {
                    setConnectionState(prev => ({
                      ...prev,
                      status: 'error',
                      lastError:
                        reconnectError instanceof Error
                          ? reconnectError
                          : new Error('Reconnection failed'),
                    }));
                  }
                }, 0);

                return {
                  ...prev,
                  reconnectAttempts: newAttempts,
                };
              }
              return prev;
            });
          }, delay);
        }
      };
    },
    [handleSSEEvent]
  );

  /**
   * Establishes the SSE connection.
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState(prev => ({ ...prev, status: 'connecting' }));

    try {
      const eventSource = new EventSource(config.url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionState(prev => ({
          ...prev,
          status: 'connected',
          reconnectAttempts: 0,
          lastError: undefined,
        }));
      };

      eventSource.onmessage = handleSSEEvent;
      eventSource.onerror = createReconnectionHandler(config);
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        lastError: error instanceof Error ? error : new Error('Connection failed'),
      }));
    }
  }, [config, handleSSEEvent, createReconnectionHandler]);

  /**
   * Disconnects the SSE connection.
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionState(prev => ({ ...prev, status: 'disconnected' }));
  }, []);

  /**
   * Adds an event listener for a specific SSE event type.
   */
  const addEventListener = useCallback((eventType: string, handler: (_event: SSEEvent) => void) => {
    const handlers = eventHandlersRef.current.get(eventType) || [];
    handlers.push(handler);
    eventHandlersRef.current.set(eventType, handlers);
  }, []);

  /**
   * Removes an event listener.
   */
  const removeEventListener = useCallback(
    (eventType: string, handler: (_event: SSEEvent) => void) => {
      const handlers = eventHandlersRef.current.get(eventType) || [];
      const filtered = handlers.filter(h => h !== handler);
      if (filtered.length > 0) {
        eventHandlersRef.current.set(eventType, filtered);
      } else {
        eventHandlersRef.current.delete(eventType);
      }
    },
    []
  );

  // Auto-connect on mount and URL changes
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    connectionState,
    addEventListener,
    removeEventListener,
    connect,
    disconnect,
  };
}
