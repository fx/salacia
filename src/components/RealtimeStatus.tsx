/**
 * RealtimeStatus component shows the connection status for SSE realtime updates.
 * Displays connection state with visual indicators and message counts.
 * 
 * @module RealtimeStatus
 */

import React from 'react';
import type { SSEConnectionState } from '../hooks/useSSE.js';

/**
 * Props for the RealtimeStatus component.
 */
export interface RealtimeStatusProps {
  /** Current connection state */
  connectionState: SSEConnectionState;
  /** Number of messages received in current session */
  messageCount: number;
  /** Whether there are new unread messages */
  hasNewMessages: boolean;
  /** Callback to clear new message indicator */
  onClearNewMessages?: () => void;
}

/**
 * Maps connection states to display properties.
 */
const stateConfig = {
  disconnected: {
    label: 'Disconnected',
    color: 'var(--wui-color-red)',
    symbol: '○',
  },
  connecting: {
    label: 'Connecting...',
    color: 'var(--wui-color-yellow)',
    symbol: '◐',
  },
  connected: {
    label: 'Connected',
    color: 'var(--wui-color-green)',
    symbol: '●',
  },
  reconnecting: {
    label: 'Reconnecting...',
    color: 'var(--wui-color-yellow)',
    symbol: '◐',
  },
  error: {
    label: 'Error',
    color: 'var(--wui-color-red)',
    symbol: '✗',
  },
} as const;

/**
 * RealtimeStatus component displays the current SSE connection status.
 * Shows visual indicators for connection state and new message notifications.
 * 
 * @param props - Component props
 * @returns JSX element representing the realtime status indicator
 */
export function RealtimeStatus({
  connectionState,
  messageCount,
  hasNewMessages,
  onClearNewMessages,
}: RealtimeStatusProps): React.ReactElement {
  const config = stateConfig[connectionState];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5ch',
        fontSize: 'small',
      }}
      role="status"
      aria-live="polite"
      aria-label={`Realtime connection: ${config.label}`}
    >
      {/* Connection indicator */}
      <span
        style={{
          color: config.color,
          animation: connectionState === 'connecting' || connectionState === 'reconnecting'
            ? 'pulse 1.5s ease-in-out infinite'
            : hasNewMessages
            ? 'flash 0.5s ease-in-out 3'
            : undefined,
        }}
        title={config.label}
      >
        {config.symbol}
      </span>

      {/* Status label */}
      <span style={{ opacity: 0.8 }}>
        {config.label}
      </span>

      {/* Message count */}
      {connectionState === 'connected' && messageCount > 0 && (
        <span style={{ opacity: 0.6 }}>
          ({messageCount} {messageCount === 1 ? 'message' : 'messages'})
        </span>
      )}

      {/* New messages indicator */}
      {hasNewMessages && onClearNewMessages && (
        <button
          onClick={onClearNewMessages}
          is-="button"
          variant-="text"
          size-="small"
          type="button"
          style={{
            marginLeft: '0.5ch',
            animation: 'flash 0.5s ease-in-out infinite',
          }}
          aria-label="New messages available, click to clear indicator"
        >
          New!
        </button>
      )}

      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes flash {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      ` }} />
    </div>
  );
}

export default RealtimeStatus;