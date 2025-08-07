/**
 * React hook for real-time message updates via Server-Sent Events.
 *
 * Provides live message updates that integrate with cursor-based pagination
 * by prepending new messages to the existing list and handling cursor compatibility.
 *
 * @example
 * ```tsx
 * const { newMessages, clearNewMessages, hasNewMessages, connectionState } = useRealTimeMessages({
 *   onMessageReceived: (message) => console.log('New message:', message),
 *   enabled: true,
 * });
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSSEConnection } from './useSSEConnection.js';
import type { MessageDisplay } from '../lib/types/messages.js';
import type { SSEEvent, SSEMessageEvent } from '../lib/types/sse.js';

/**
 * Configuration for real-time messages hook.
 */
export interface RealTimeMessagesConfig {
  /** Callback triggered when a new message is received */
  onMessageReceived?: (_message: MessageDisplay) => void;
  /** Whether real-time updates are enabled */
  enabled?: boolean;
  /** SSE endpoint URL (defaults to /api/messages/stream) */
  sseUrl?: string;
}

/**
 * State for managing new messages that arrive via real-time updates.
 */
export interface RealTimeMessagesState {
  /** Array of new messages received since last clear */
  newMessages: MessageDisplay[];
  /** Whether there are unacknowledged new messages */
  hasNewMessages: boolean;
  /** Connection state from the underlying SSE connection */
  connectionState: ReturnType<typeof useSSEConnection>['connectionState'];
}

/**
 * Hook for managing real-time message updates.
 */
export function useRealTimeMessages(config: RealTimeMessagesConfig = {}) {
  const { onMessageReceived, enabled = true, sseUrl = '/api/messages/stream' } = config;

  const [newMessages, setNewMessages] = useState<MessageDisplay[]>([]);
  const callbackRef = useRef(onMessageReceived);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  // SSE connection for real-time updates
  const { connectionState, addEventListener, removeEventListener } = useSSEConnection({
    url: sseUrl,
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
  });

  /**
   * Handles incoming message creation events from SSE.
   */
  const handleMessageCreated = useCallback((event: SSEEvent) => {
    if (event.type === 'message_created') {
      const messageEvent = event as SSEMessageEvent;
      const newMessage = messageEvent.data;

      setNewMessages(prev => [newMessage, ...prev]);

      // Trigger callback if provided
      if (callbackRef.current) {
        callbackRef.current(newMessage);
      }
    }
  }, []);

  /**
   * Clears all new messages from the state.
   * Call this when messages have been integrated into the main list.
   */
  const clearNewMessages = useCallback(() => {
    setNewMessages([]);
  }, []);

  /**
   * Gets and clears new messages in a single operation.
   * Useful for integrating messages while ensuring no race conditions.
   */
  const consumeNewMessages = useCallback((): MessageDisplay[] => {
    let messages: MessageDisplay[] = [];
    setNewMessages(prev => {
      messages = prev;
      return [];
    });
    return messages;
  }, []);

  // Set up SSE event listeners
  useEffect(() => {
    if (!enabled) {
      return;
    }

    addEventListener('message_created', handleMessageCreated);

    return () => {
      removeEventListener('message_created', handleMessageCreated);
    };
  }, [enabled, addEventListener, removeEventListener, handleMessageCreated]);

  const state: RealTimeMessagesState = {
    newMessages,
    hasNewMessages: newMessages.length > 0,
    connectionState,
  };

  return {
    ...state,
    clearNewMessages,
    consumeNewMessages,
  };
}
