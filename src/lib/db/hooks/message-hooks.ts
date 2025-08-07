import type { Model, Transaction } from 'sequelize';

/**
 * Hook execution phase indicator.
 * Specifies whether the hook is running before or after the database operation.
 */
export type HookPhase = 'before' | 'after';

/**
 * Options passed to Sequelize hooks.
 * Contains transaction information and other hook-specific data.
 */
interface HookOptions {
  transaction?: Transaction;
  [key: string]: unknown;
}

/**
 * Structure for tracking message update events.
 * Captures the essential information needed to monitor changes to AI interactions.
 */
interface MessageUpdateEvent {
  /** The phase when this event was captured */
  phase: HookPhase;
  /** Unique identifier of the AI interaction being tracked */
  interactionId: string;
  /** Model name used in the interaction */
  model: string;
  /** Request payload snapshot (for context) */
  request: Record<string, unknown>;
  /** Response payload snapshot (may be different between before/after) */
  response?: Record<string, unknown>;
  /** Token usage information */
  tokenUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  /** Performance metrics */
  performance?: {
    responseTimeMs?: number;
    statusCode?: number;
  };
  /** Error information if applicable */
  error?: string;
  /** Timestamp when the event was captured */
  timestamp: Date;
}

/**
 * In-memory store for tracking message updates.
 * In a production environment, this would typically be replaced with
 * a more robust solution like a message queue, audit log table, or
 * external monitoring system.
 */
const messageUpdateEvents: MessageUpdateEvent[] = [];

/**
 * Extracts message content from AI interaction data for tracking purposes.
 * Handles different AI provider request/response formats to normalize message data.
 *
 * @param request - The AI provider request payload
 * @param response - The AI provider response payload (optional)
 * @returns Normalized message data for tracking
 */
function extractMessageData(
  request: Record<string, unknown>,
  response?: Record<string, unknown>
): { messages?: unknown[]; content?: string } {
  const data: { messages?: unknown[]; content?: string } = {};

  // Extract messages from request (common in chat-based APIs)
  if (Array.isArray(request.messages)) {
    data.messages = request.messages;
  }

  // Extract content from response
  if (response) {
    // Handle different response formats
    if (typeof response.content === 'string') {
      data.content = response.content;
    } else if (response.choices && Array.isArray(response.choices)) {
      // OpenAI-style response format
      const firstChoice = response.choices[0] as any;
      if (firstChoice?.message?.content) {
        data.content = firstChoice.message.content;
      }
    } else if (response.message?.content) {
      // Anthropic-style response format
      data.content = response.message.content;
    }
  }

  return data;
}

/**
 * Core tracking function for AI interaction message updates.
 * This function is called by the Sequelize hooks to capture and store
 * information about message changes during database operations.
 *
 * The tracking system enables:
 * - Audit trails for AI interaction modifications
 * - Analytics on message update patterns
 * - Debugging support for message processing issues
 * - Performance monitoring of update operations
 *
 * @param phase - Whether this is called before or after the database operation
 * @param instance - The AiInteraction model instance being updated
 * @param options - Sequelize hook options with transaction context
 *
 * @example
 * ```typescript
 * // This function is typically called automatically by Sequelize hooks:
 * hooks: {
 *   beforeUpdate: async (instance, options) => {
 *     await trackMessageUpdate('before', instance, options);
 *   },
 *   afterUpdate: async (instance, options) => {
 *     await trackMessageUpdate('after', instance, options);
 *   }
 * }
 * ```
 */
export async function trackMessageUpdate(
  phase: HookPhase,
  instance: Model,
  options: HookOptions
): Promise<void> {
  try {
    // Extract relevant data from the model instance
    const instanceData = instance.toJSON() as any;
    const interactionId = instanceData.id;
    const model = instanceData.model;
    const request = instanceData.request;
    const response = instanceData.response;

    // Extract normalized message data
    const messageData = extractMessageData(request, response);

    // Create tracking event
    const event: MessageUpdateEvent = {
      phase,
      interactionId,
      model,
      request,
      response,
      tokenUsage: {
        prompt: instanceData.promptTokens,
        completion: instanceData.completionTokens,
        total: instanceData.totalTokens,
      },
      performance: {
        responseTimeMs: instanceData.responseTimeMs,
        statusCode: instanceData.statusCode,
      },
      error: instanceData.error,
      timestamp: new Date(),
    };

    // Store the event (in production, this might go to a queue or audit log)
    messageUpdateEvents.push(event);

    // Log the tracking event for debugging purposes
    console.log(
      `[MessageTracker] ${phase.toUpperCase()} update tracked for interaction ${interactionId}`,
      {
        model,
        hasMessages: !!messageData.messages,
        hasContent: !!messageData.content,
        tokenUsage: event.tokenUsage,
        transaction: !!options.transaction,
      }
    );

    // In a production environment, you might want to:
    // - Send the event to a message queue for async processing
    // - Store in a separate audit log table
    // - Trigger webhooks or notifications
    // - Update analytics dashboards
    // - Validate message content for compliance
  } catch (error) {
    // Log errors but don't fail the database operation
    console.error('[MessageTracker] Error tracking message update:', error);
  }
}

/**
 * Retrieves tracked message update events for analysis or debugging.
 * In a production system, this would query a persistent store instead of memory.
 *
 * @param interactionId - Optional filter for specific interaction ID
 * @param phase - Optional filter for specific hook phase
 * @param limit - Maximum number of events to return (defaults to 100)
 * @returns Array of message update events matching the filters
 *
 * @example
 * ```typescript
 * // Get all events for a specific interaction
 * const events = await getMessageUpdateEvents('some-interaction-id');
 *
 * // Get only 'after' events
 * const afterEvents = await getMessageUpdateEvents(undefined, 'after');
 *
 * // Get recent events with limit
 * const recentEvents = await getMessageUpdateEvents(undefined, undefined, 50);
 * ```
 */
export async function getMessageUpdateEvents(
  interactionId?: string,
  phase?: HookPhase,
  limit: number = 100
): Promise<MessageUpdateEvent[]> {
  let filteredEvents = [...messageUpdateEvents];

  // Apply filters
  if (interactionId) {
    filteredEvents = filteredEvents.filter(event => event.interactionId === interactionId);
  }

  if (phase) {
    filteredEvents = filteredEvents.filter(event => event.phase === phase);
  }

  // Sort by timestamp (most recent first) and apply limit
  return filteredEvents
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Clears tracked message update events from memory.
 * Useful for testing or memory management in development.
 * In production, this would likely manage persistent storage cleanup.
 *
 * @param olderThan - Optional cutoff date to only clear events older than specified time
 *
 * @example
 * ```typescript
 * // Clear all events
 * clearMessageUpdateEvents();
 *
 * // Clear events older than 1 hour
 * const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
 * clearMessageUpdateEvents(oneHourAgo);
 * ```
 */
export function clearMessageUpdateEvents(olderThan?: Date): void {
  if (olderThan) {
    const originalLength = messageUpdateEvents.length;
    messageUpdateEvents.splice(
      0,
      messageUpdateEvents.length,
      ...messageUpdateEvents.filter(event => event.timestamp > olderThan)
    );
    console.log(
      `[MessageTracker] Cleared ${originalLength - messageUpdateEvents.length} old events`
    );
  } else {
    const clearedCount = messageUpdateEvents.length;
    messageUpdateEvents.splice(0);
    console.log(`[MessageTracker] Cleared ${clearedCount} tracked events`);
  }
}

/**
 * Exports for TypeScript type checking and testing.
 * These types can be used when working with the tracking system.
 */
export type { MessageUpdateEvent, HookPhase, HookOptions };
