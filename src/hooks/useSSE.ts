/**
 * React hook for managing Server-Sent Events (SSE) connections.
 * Provides automatic connection management, reconnection logic, and error handling.
 *
 * @param url - The SSE endpoint URL
 * @param options - Configuration options for the SSE connection
 * @returns Object containing connection state, last event ID, and control functions
 *
 * @example
 * ```tsx
 * const { connectionState, lastEventId, connect, disconnect } = useSSE(
 *   '/api/sse/messages',
 *   {
 *     reconnect: true,
 *     reconnectDelay: 1000,
 *     maxReconnectAttempts: 5
 *   }
 * );
 * ```
 *
 * @module useSSE
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SSE connection states.
 */
export type SSEConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * SSE event data structure matching server response format.
 */
export interface SSEEvent {
  /**
   * Event identifier for Last-Event-ID tracking.
   */
  id: string;

  /**
   * Event type (e.g., 'message:created', 'connected', 'heartbeat').
   */
  type: string;

  /**
   * Event creation timestamp in ISO format.
   */
  createdAt: string;

  /**
   * Event payload data.
   */
  data?: unknown;
}

/**
 * Configuration options for SSE connection.
 */
export interface SSEOptions {
  /**
   * Whether to automatically reconnect on connection loss.
   * @default true
   */
  reconnect?: boolean;

  /**
   * Delay in milliseconds before attempting reconnection.
   * @default 1000
   */
  reconnectDelay?: number;

  /**
   * Maximum number of reconnection attempts. Set to 0 for infinite.
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * Initial Last-Event-ID to resume from.
   */
  lastEventId?: string;

  /**
   * Whether to automatically connect on mount.
   * @default true
   */
  autoConnect?: boolean;
}

/**
 * Event handler function type.
 */
export type SSEEventHandler = (_event: SSEEvent) => void;

/**
 * Error handler function type.
 */
export type SSEErrorHandler = (_error: globalThis.Event | Error) => void;

/**
 * Default SSE options.
 */
const DEFAULT_OPTIONS: Required<Omit<SSEOptions, 'lastEventId'>> = {
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  autoConnect: true,
};

/**
 * Custom hook for managing SSE connections with automatic reconnection.
 *
 * @param url - SSE endpoint URL
 * @param options - Connection configuration options
 * @returns SSE connection state and control functions
 */
export function useSSE(url: string, options: SSEOptions = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Connection state
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [lastEventId, setLastEventId] = useState<string | undefined>(options.lastEventId);
  const [error, setError] = useState<Error | null>(null);

  // Refs for managing connection lifecycle
  const eventSourceRef = useRef<globalThis.EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const eventHandlersRef = useRef<Map<string, SSEEventHandler[]>>(new Map());
  const errorHandlersRef = useRef<SSEErrorHandler[]>([]);
  const isManuallyDisconnectedRef = useRef(false);

  /**
   * Add an event listener for specific SSE event types.
   */
  const addEventListener = useCallback((eventType: string, handler: SSEEventHandler) => {
    const handlers = eventHandlersRef.current.get(eventType) || [];
    handlers.push(handler);
    eventHandlersRef.current.set(eventType, handlers);

    // Return cleanup function
    return () => {
      const currentHandlers = eventHandlersRef.current.get(eventType) || [];
      const index = currentHandlers.indexOf(handler);
      if (index !== -1) {
        currentHandlers.splice(index, 1);
        if (currentHandlers.length === 0) {
          eventHandlersRef.current.delete(eventType);
        } else {
          eventHandlersRef.current.set(eventType, currentHandlers);
        }
      }
    };
  }, []);

  /**
   * Add an error event listener.
   */
  const addErrorListener = useCallback((handler: SSEErrorHandler) => {
    errorHandlersRef.current.push(handler);

    // Return cleanup function
    return () => {
      const index = errorHandlersRef.current.indexOf(handler);
      if (index !== -1) {
        errorHandlersRef.current.splice(index, 1);
      }
    };
  }, []);

  /**
   * Create and configure EventSource connection.
   */
  const createConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState('connecting');
    setError(null);

    // Build URL with Last-Event-ID parameter if available
    const connectionUrl = new globalThis.URL(
      url,
      typeof globalThis.window !== 'undefined'
        ? globalThis.window.location.origin
        : 'http://localhost'
    );
    if (lastEventId) {
      connectionUrl.searchParams.set('lastEventId', lastEventId);
    }

    const eventSource = new globalThis.EventSource(connectionUrl.toString());
    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.onopen = () => {
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;
    };

    // Handle connection errors
    eventSource.onerror = _event => {
      const errorObj = new Error('SSE connection error');
      setError(errorObj);

      // Notify error handlers
      errorHandlersRef.current.forEach(handler => handler(errorObj));

      if (eventSource.readyState === globalThis.EventSource.CLOSED) {
        setConnectionState('error');

        // Attempt reconnection if enabled and not manually disconnected
        if (mergedOptions.reconnect && !isManuallyDisconnectedRef.current) {
          const shouldReconnect =
            mergedOptions.maxReconnectAttempts === 0 ||
            reconnectAttemptsRef.current < mergedOptions.maxReconnectAttempts;

          if (shouldReconnect) {
            setConnectionState('reconnecting');
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              createConnection();
            }, mergedOptions.reconnectDelay);
          } else {
            setConnectionState('error');
          }
        }
      }
    };

    // Handle all SSE messages
    eventSource.onmessage = event => {
      try {
        const sseEvent: SSEEvent = JSON.parse(event.data);

        // Update last event ID for reconnection tracking
        if (event.lastEventId) {
          setLastEventId(event.lastEventId);
        }

        // Call registered handlers for this event type
        const handlers = eventHandlersRef.current.get(sseEvent.type) || [];
        handlers.forEach(handler => handler(sseEvent));

        // Also call handlers for 'message' type (catch-all)
        const messageHandlers = eventHandlersRef.current.get('message') || [];
        messageHandlers.forEach(handler => handler(sseEvent));
      } catch (parseError) {
        const error =
          parseError instanceof Error ? parseError : new Error('Failed to parse SSE event');
        setError(error);
        errorHandlersRef.current.forEach(handler => handler(error));
      }
    };

    // Handle specific event types (like 'connected', 'heartbeat', etc.)
    const eventTypes = ['connected', 'heartbeat', 'message:created', 'stats:updated'];
    eventTypes.forEach(eventType => {
      eventSource.addEventListener(eventType, (event: globalThis.Event) => {
        const messageEvent = event as globalThis.MessageEvent;
        try {
          const sseEvent: SSEEvent = JSON.parse(messageEvent.data);

          // Update last event ID
          if (messageEvent.lastEventId) {
            setLastEventId(messageEvent.lastEventId);
          }

          // Call registered handlers
          const handlers = eventHandlersRef.current.get(eventType) || [];
          handlers.forEach(handler => handler(sseEvent));
        } catch (parseError) {
          const error =
            parseError instanceof Error
              ? parseError
              : new Error(`Failed to parse ${eventType} event`);
          setError(error);
          errorHandlersRef.current.forEach(handler => handler(error));
        }
      });
    });

    return eventSource;
  }, [
    url,
    lastEventId,
    mergedOptions.reconnect,
    mergedOptions.reconnectDelay,
    mergedOptions.maxReconnectAttempts,
  ]);

  /**
   * Manually connect to SSE endpoint.
   */
  const connect = useCallback(() => {
    isManuallyDisconnectedRef.current = false;
    reconnectAttemptsRef.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    createConnection();
  }, [createConnection]);

  /**
   * Manually disconnect from SSE endpoint.
   */
  const disconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState('disconnected');
    setError(null);
  }, []);

  /**
   * Reset connection state and retry connection.
   */
  const retry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (mergedOptions.autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []); // Empty deps to only run on mount/unmount

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    connectionState,
    lastEventId,
    error,
    connect,
    disconnect,
    retry,
    addEventListener,
    addErrorListener,
    reconnectAttempts: reconnectAttemptsRef.current,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting',
  };
}

export default useSSE;
