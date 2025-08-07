/**
 * React hook for managing connectivity status indicators in the navigation.
 *
 * Provides connection status with visual indicators and flash animations
 * for state changes and new message notifications.
 *
 * @example
 * ```tsx
 * const { status, isFlashing, flashCount } = useConnectivityStatus({
 *   sseUrl: '/api/messages/stream',
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSSEConnection } from './useSSEConnection.js';
import type { SSEEvent, SSEConnectionConfig } from '../lib/types/sse.js';

/**
 * Configuration for connectivity status hook.
 */
export interface ConnectivityStatusConfig {
  sseUrl: string;
  autoReconnect?: boolean;
  flashDuration?: number;
}

/**
 * Connectivity status information for UI display.
 */
export interface ConnectivityStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  isFlashing: boolean;
  flashCount: number;
  connectionId?: string;
  lastError?: Error;
}

/**
 * Hook for managing connectivity status with visual indicators.
 */
export function useConnectivityStatus(config: ConnectivityStatusConfig): ConnectivityStatus {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashCount, setFlashCount] = useState(0);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef<string>('disconnected');

  const sseConfig: SSEConnectionConfig = {
    url: config.sseUrl,
    autoReconnect: config.autoReconnect ?? true,
    reconnectDelay: 2000,
    maxReconnectAttempts: 5,
  };

  const { connectionState, addEventListener, removeEventListener } = useSSEConnection(sseConfig);

  /**
   * Triggers a flash animation for visual feedback.
   */
  const triggerFlash = useCallback(() => {
    setFlashCount(prev => prev + 1);
    setIsFlashing(true);

    // Clear existing timeout
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    // Set flash duration
    const flashDuration = config.flashDuration ?? 800;
    flashTimeoutRef.current = setTimeout(() => {
      setIsFlashing(false);
    }, flashDuration);
  }, [config.flashDuration]);

  /**
   * Handles message events to trigger flash indicators.
   */
  const handleMessageEvent = useCallback(
    (event: SSEEvent) => {
      if (event.type === 'message_created' || event.type === 'message_updated') {
        triggerFlash();
      }
    },
    [triggerFlash]
  );

  // Monitor connection status changes for flash indicators
  useEffect(() => {
    const currentStatus = connectionState.status;
    const prevStatus = prevStatusRef.current;

    // Trigger flash on status changes (except initial connection)
    if (prevStatus !== 'disconnected' && currentStatus !== prevStatus) {
      triggerFlash();
    }

    prevStatusRef.current = currentStatus;
  }, [connectionState.status, triggerFlash]);

  // Register message event listeners
  useEffect(() => {
    addEventListener('message_created', handleMessageEvent);
    addEventListener('message_updated', handleMessageEvent);

    return () => {
      removeEventListener('message_created', handleMessageEvent);
      removeEventListener('message_updated', handleMessageEvent);
    };
  }, [addEventListener, removeEventListener, handleMessageEvent]);

  // Cleanup flash timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  return {
    status: connectionState.status,
    isFlashing,
    flashCount,
    connectionId: connectionState.connectionId,
    lastError: connectionState.lastError,
  };
}
