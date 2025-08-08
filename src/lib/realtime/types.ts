/**
 * Realtime messaging types for server-side event propagation.
 * These types describe the minimal payloads and envelopes used by the broker and SSE.
 *
 * The shapes are intentionally small and stable to keep payloads light,
 * while still supporting cursor-based ordering by (createdAt, id).
 */

/**
 * Supported realtime event kinds.
 */
export type RealtimeEventType = 'message:created';

/**
 * Minimal payload for a newly created message.
 * Designed to be compatible with cursor ordering and client-side dedupe by id.
 */
export interface MessageCreatedEventData {
  /**
   * Unique identifier of the message (AiInteraction.id).
   */
  id: string;

  /**
   * Creation timestamp of the message.
   * Stored as a Date server-side; will be serialized to ISO-8601 for SSE.
   */
  createdAt: Date;

  /**
   * Optional model name used to quickly render UI hints.
   */
  model?: string;

  /**
   * Optional HTTP status code for success/failure quick checks.
   */
  statusCode?: number;

  /**
   * Optional error field for failed interactions.
   */
  error?: string;
}

/**
 * Generic envelope for all realtime events.
 */
export interface RealtimeEvent<T = unknown> {
  /**
   * Monotonic id for the event stream usage (reuse message id for message:created).
   */
  id: string;

  /**
   * Event creation timestamp.
   */
  createdAt: Date;

  /**
   * Event kind.
   */
  type: RealtimeEventType;

  /**
   * Event payload.
   */
  data: T;
}
