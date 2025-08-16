import { EventEmitter } from 'node:events';
import type {
  MessageCreatedEventData,
  MessageUpdatedEventData,
  RealtimeEvent,
  RealtimeEventType,
} from './types.js';

/**
 * In-process realtime broker for server-side event propagation.
 *
 * Provides:
 * - Typed emission for message:created events
 * - Subscription management
 * - Small ring buffer for short-term replay (Last-Event-ID)
 *
 * This broker is single-process only. Multi-process fanout can be added later
 * via Postgres LISTEN/NOTIFY or an external message bus.
 */
class RealtimeBroker extends EventEmitter {
  /**
   * Maximum number of events kept in the in-memory buffer for replay.
   */
  private readonly bufferSize = 256;

  /**
   * Ring buffer storing the most recent events for Last-Event-ID replay.
   */
  private buffer: RealtimeEvent[] = [];

  /**
   * Emit a message:created event with normalized payload.
   *
   * @param data - Minimal payload describing the created message
   */
  emitMessageCreated(data: MessageCreatedEventData): void {
    const evt: RealtimeEvent<MessageCreatedEventData> = {
      id: data.id,
      createdAt: data.createdAt,
      type: 'message:created',
      data,
    };

    this.pushToBuffer(evt);
    this.emit(evt.type, evt);
  }

  /**
   * Emit a message:updated event with normalized payload.
   *
   * @param data - Minimal payload describing the updated message
   */
  emitMessageUpdated(data: MessageUpdatedEventData): void {
    const evt: RealtimeEvent<MessageUpdatedEventData> = {
      id: data.id,
      createdAt: new Date(), // Use current time for update event
      type: 'message:updated',
      data,
    };

    this.pushToBuffer(evt);
    this.emit(evt.type, evt);
  }

  /**
   * Subscribe to a specific realtime event type.
   *
   * @param type - Event type to subscribe to
   * @param handler - Callback invoked when events of this type are emitted
   * @returns Unsubscribe function to remove the listener
   */
  subscribe<T = unknown>(type: RealtimeEventType, handler: (_event: RealtimeEvent<T>) => void) {
    this.on(type, handler as (_event: RealtimeEvent<T>) => void);
    return () => this.off(type, handler as (_event: RealtimeEvent<T>) => void);
  }

  /**
   * Returns buffered events that occurred after the given Last-Event-ID.
   * If the id is not found, returns an empty list, prompting a client refetch.
   *
   * @param lastEventId - The last event id the client has processed
   */
  getEventsSince(lastEventId?: string | null): RealtimeEvent[] {
    if (!lastEventId) return [];
    const idx = this.buffer.findIndex(e => e.id === lastEventId);
    if (idx === -1) return [];
    return this.buffer.slice(idx + 1);
  }

  /**
   * Push an event into the ring buffer with bounded size.
   */
  private pushToBuffer(evt: RealtimeEvent): void {
    this.buffer.push(evt);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }
}

/**
 * Singleton broker instance shared across the server runtime.
 */
export const broker = new RealtimeBroker();
