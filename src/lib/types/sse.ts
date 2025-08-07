import type { MessageDisplay } from './messages.js';

/**
 * Server-Sent Events (SSE) type definitions for real-time message updates.
 */

/**
 * Available SSE event types for message updates.
 */
export type SSEEventType =
  | 'message_created'
  | 'message_updated'
  | 'message_deleted'
  | 'connection_opened'
  | 'heartbeat';

/**
 * Base structure for all SSE event data.
 */
export interface SSEEventBase {
  type: SSEEventType;
  timestamp: string;
  id?: string;
}

/**
 * SSE event data for message operations.
 */
export interface SSEMessageEvent extends SSEEventBase {
  type: 'message_created' | 'message_updated';
  data: MessageDisplay;
}

/**
 * SSE event data for message deletions.
 */
export interface SSEMessageDeletedEvent extends SSEEventBase {
  type: 'message_deleted';
  data: { id: string };
}

/**
 * SSE event data for connection events.
 */
export interface SSEConnectionEvent extends SSEEventBase {
  type: 'connection_opened';
  data: { message: string };
}

/**
 * SSE event data for heartbeats.
 */
export interface SSEHeartbeatEvent extends SSEEventBase {
  type: 'heartbeat';
  data: {
    serverTime: string;
    connectionId: string;
  };
}

/**
 * Union type for all SSE events.
 */
export type SSEEvent =
  | SSEMessageEvent
  | SSEMessageDeletedEvent
  | SSEConnectionEvent
  | SSEHeartbeatEvent;

/**
 * SSE connection configuration.
 */
export interface SSEConnectionConfig {
  url: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

/**
 * SSE connection state.
 */
export interface SSEConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError?: Error;
  reconnectAttempts: number;
  connectionId?: string;
}
