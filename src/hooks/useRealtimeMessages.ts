/**
 * React hook for real-time message updates using Server-Sent Events.
 * Combines SSE connection management with message state synchronization.
 *
 * This hook automatically maintains a synchronized view of messages by:
 * - Establishing SSE connection to receive real-time events
 * - Handling message:created events to update local state
 * - Providing connection status and error handling
 * - Supporting manual refresh and reconnection
 *
 * @param options - Configuration options for the realtime connection
 * @returns Object containing message state, connection info, and control functions
 *
 * @example
 * ```tsx
 * const { messages, connectionState, addMessage, refresh } = useRealtimeMessages({
 *   endpoint: '/api/sse/messages',
 *   autoConnect: true
 * });
 * ```
 *
 * @module useRealtimeMessages
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSSE, type SSEEvent } from './useSSE.js';
import { MESSAGES_CONSTANTS, type MessageDisplay } from '../lib/types/messages.js';
import type { MessageCreatedEventData } from '../lib/realtime/types.js';

/**
 * Configuration options for the realtime messages hook.
 */
export interface RealtimeMessagesOptions {
  /**
   * SSE endpoint URL for message events.
   * @default '/api/sse/messages'
   */
  endpoint?: string;

  /**
   * Whether to automatically connect on mount.
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Whether to automatically reconnect on connection loss.
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Initial messages to populate the state.
   * @default []
   */
  initialMessages?: MessageDisplay[];

  /**
   * Maximum number of messages to keep in memory.
   * Older messages will be removed when this limit is exceeded.
   * Set to 0 for no limit.
   * @default 1000
   */
  maxMessages?: number;

  /**
   * Custom message transformation function.
   * Allows customization of how SSE event data is converted to MessageDisplay.
   */
  transformMessage?: (_eventData: MessageCreatedEventData) => MessageDisplay;
}

/**
 * Default options for the realtime messages hook.
 */
const DEFAULT_OPTIONS: Required<Omit<RealtimeMessagesOptions, 'transformMessage'>> = {
  endpoint: '/api/sse/messages',
  autoConnect: true,
  autoReconnect: true,
  initialMessages: [],
  maxMessages: 1000,
};

/**
 * Default message transformation function.
 * Converts SSE event data to MessageDisplay format.
 */
export const defaultTransformMessage = (eventData: MessageCreatedEventData): MessageDisplay => {
  // Build a MessageDisplay consistent with DB transformation
  // Reuse preview extraction rules similar to transformAiInteractionToDisplay
  let requestPreview = 'No request data';
  if (eventData.request) {
    try {
      const reqStr =
        typeof eventData.request === 'string'
          ? eventData.request
          : JSON.stringify(eventData.request);
      requestPreview =
        reqStr.length > MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH
          ? `${reqStr.substring(0, MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH)}...`
          : reqStr;
    } catch {
      requestPreview = 'Invalid request data';
    }
  }

  let responsePreview: string | undefined;
  if (eventData.response) {
    try {
      const resStr =
        typeof eventData.response === 'string'
          ? eventData.response
          : JSON.stringify(eventData.response);
      responsePreview =
        resStr.length > MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH
          ? `${resStr.substring(0, MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH)}...`
          : resStr;
    } catch {
      responsePreview = 'Invalid response data';
    }
  }

  const statusCode = eventData.statusCode ?? undefined;
  const error = eventData.error ?? undefined;

  return {
    id: eventData.id,
    model: eventData.model ?? 'unknown',
    provider: undefined,
    createdAt: new Date(eventData.createdAt),
    responseTime: eventData.responseTimeMs ?? undefined,
    totalTokens: eventData.totalTokens ?? undefined,
    promptTokens: eventData.promptTokens ?? undefined,
    completionTokens: eventData.completionTokens ?? undefined,
    statusCode,
    error,
    requestPreview,
    responsePreview,
    isSuccess: !error && statusCode === 200,
    request: eventData.request ?? null,
    response: eventData.response,
  };
};

/**
 * Statistics for real-time message tracking.
 */
export interface RealtimeMessageStats {
  /** Total number of messages received via real-time events */
  totalReceived: number;
  /** Number of successful messages */
  successCount: number;
  /** Number of failed messages */
  errorCount: number;
  /** Connection uptime in milliseconds */
  connectionUptime: number;
  /** Last event received timestamp */
  lastEventTime?: Date;
}

/**
 * Custom hook for managing real-time message updates via SSE.
 *
 * @param options - Configuration options
 * @returns Real-time message state and control functions
 */
export function useRealtimeMessages(options: RealtimeMessagesOptions = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const transformMessage = options.transformMessage || defaultTransformMessage;

  // Message state
  const [messages, setMessages] = useState<MessageDisplay[]>(mergedOptions.initialMessages);
  const [stats, setStats] = useState<RealtimeMessageStats>({
    totalReceived: 0,
    successCount: 0,
    errorCount: 0,
    connectionUptime: 0,
  });

  // Connection start time for uptime calculation
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);

  // SSE connection management
  const {
    connectionState,
    lastEventId,
    error: sseError,
    connect,
    disconnect,
    retry,
    addEventListener,
    addErrorListener,
    isConnected,
    isConnecting,
  } = useSSE(mergedOptions.endpoint, {
    autoConnect: mergedOptions.autoConnect,
    reconnect: mergedOptions.autoReconnect,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
  });

  /**
   * Handle incoming message:created events.
   */
  const handleMessageCreated = useCallback(
    (event: SSEEvent) => {
      try {
        const eventData = event.data as MessageCreatedEventData;
        const newMessage = transformMessage(eventData);

        setMessages(prevMessages => {
          // Check if message already exists (deduplicate)
          const existingIndex = prevMessages.findIndex(msg => msg.id === newMessage.id);

          let updatedMessages: MessageDisplay[];
          if (existingIndex !== -1) {
            // Update existing message
            updatedMessages = [...prevMessages];
            updatedMessages[existingIndex] = newMessage;
          } else {
            // Add new message at the beginning (most recent first)
            updatedMessages = [newMessage, ...prevMessages];
          }

          // Apply max messages limit
          if (mergedOptions.maxMessages > 0 && updatedMessages.length > mergedOptions.maxMessages) {
            updatedMessages = updatedMessages.slice(0, mergedOptions.maxMessages);
          }

          return updatedMessages;
        });

        // Update statistics
        setStats(prevStats => ({
          totalReceived: prevStats.totalReceived + 1,
          successCount: newMessage.isSuccess ? prevStats.successCount + 1 : prevStats.successCount,
          errorCount: !newMessage.isSuccess ? prevStats.errorCount + 1 : prevStats.errorCount,
          connectionUptime: connectionStartTime ? Date.now() - connectionStartTime.getTime() : 0,
          lastEventTime: new Date(),
        }));
      } catch (error) {
        console.error('Failed to process message:created event:', error);
      }
    },
    [transformMessage, mergedOptions.maxMessages, connectionStartTime]
  );

  /**
   * Handle connection established events.
   */
  const handleConnected = useCallback((_event: SSEEvent) => {
    setConnectionStartTime(new Date());
    // Connection established
  }, []);

  /**
   * Handle heartbeat events.
   */
  const handleHeartbeat = useCallback(
    (_event: SSEEvent) => {
      // Update connection uptime
      setStats(prevStats => ({
        ...prevStats,
        connectionUptime: connectionStartTime ? Date.now() - connectionStartTime.getTime() : 0,
      }));
    },
    [connectionStartTime]
  );

  /**
   * Handle SSE connection errors.
   */
  const handleSSEError = useCallback((error: globalThis.Event | Error) => {
    // Handle SSE connection error
    if (error instanceof Error) {
      console.error('SSE connection error:', error.message);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const unsubscribeCreated = addEventListener('message:created', handleMessageCreated);
    const unsubscribeConnected = addEventListener('connected', handleConnected);
    const unsubscribeHeartbeat = addEventListener('heartbeat', handleHeartbeat);
    const unsubscribeError = addErrorListener(handleSSEError);

    return () => {
      unsubscribeCreated();
      unsubscribeConnected();
      unsubscribeHeartbeat();
      unsubscribeError();
    };
  }, [
    addEventListener,
    addErrorListener,
    handleMessageCreated,
    handleConnected,
    handleHeartbeat,
    handleSSEError,
  ]);

  // Reset connection start time when connection state changes
  useEffect(() => {
    if (connectionState === 'connected') {
      setConnectionStartTime(new Date());
    } else if (connectionState === 'disconnected' || connectionState === 'error') {
      setConnectionStartTime(null);
    }
  }, [connectionState]);

  /**
   * Manually add a message to the local state.
   * Useful for optimistic updates or manual message injection.
   */
  const addMessage = useCallback(
    (message: MessageDisplay) => {
      setMessages(prevMessages => {
        // Check for duplicates
        const existingIndex = prevMessages.findIndex(msg => msg.id === message.id);

        let updatedMessages: MessageDisplay[];
        if (existingIndex !== -1) {
          // Update existing message
          updatedMessages = [...prevMessages];
          updatedMessages[existingIndex] = message;
        } else {
          // Add new message, maintaining sort order (newest first)
          updatedMessages = [message, ...prevMessages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        // Apply max messages limit
        if (mergedOptions.maxMessages > 0 && updatedMessages.length > mergedOptions.maxMessages) {
          updatedMessages = updatedMessages.slice(0, mergedOptions.maxMessages);
        }

        return updatedMessages;
      });
    },
    [mergedOptions.maxMessages]
  );

  /**
   * Update an existing message in the local state.
   */
  const updateMessage = useCallback((messageId: string, updates: Partial<MessageDisplay>) => {
    setMessages(prevMessages =>
      prevMessages.map(message => (message.id === messageId ? { ...message, ...updates } : message))
    );
  }, []);

  /**
   * Remove a message from the local state.
   */
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prevMessages => prevMessages.filter(message => message.id !== messageId));
  }, []);

  /**
   * Clear all messages from the local state.
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStats({
      totalReceived: 0,
      successCount: 0,
      errorCount: 0,
      connectionUptime: 0,
    });
  }, []);

  /**
   * Refresh the real-time connection.
   * Disconnects and reconnects to get a fresh event stream.
   */
  const refresh = useCallback(() => {
    retry();
  }, [retry]);

  // Computed values
  const computedStats = useMemo(() => {
    const currentUptime = connectionStartTime ? Date.now() - connectionStartTime.getTime() : 0;
    return {
      ...stats,
      connectionUptime: currentUptime,
    };
  }, [stats, connectionStartTime]);

  return {
    // Message state
    messages,
    stats: computedStats,

    // Connection state
    connectionState,
    lastEventId,
    error: sseError,
    isConnected,
    isConnecting,

    // Message operations
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,

    // Connection operations
    connect,
    disconnect,
    refresh,
  };
}

export default useRealtimeMessages;
