import { desc, asc, and, lt, gt, sql } from 'drizzle-orm';
import type {
  MessageDisplay,
  MessagesCursorPaginatedResult,
} from '../types/messages.js';
import type { MessagesCursorPaginationParams, MessageSort } from '../types/cursor.js';
import { transformAiInteractionToDisplay } from '../types/messages.js';
import { CursorUtils } from '../types/cursor.js';
import { aiInteractions } from '../db/schema.js';
import { db } from '../db/connection.js';

/**
 * Service class for managing AI message interactions.
 *
 * Provides comprehensive database operations for retrieving, filtering, and analyzing
 * AI interaction data with support for cursor-based pagination, sorting, and transformations.
 */
export class MessagesService {
  /**
   * Retrieves AI interactions using cursor-based pagination.
   * This method is optimized for efficient pagination of large datasets and real-time updates.
   *
   * @param params - Cursor pagination parameters including limit, cursor, and sort
   * @returns Promise resolving to paginated result with cursor metadata
   * @throws Error if the database query fails or cursor is invalid
   */
  static async getMessagesCursor(
    params: MessagesCursorPaginationParams
  ): Promise<MessagesCursorPaginatedResult> {
    try {
      const { limit, cursor, sort } = params;

      // Validate limit
      const safeLimit = Math.max(1, Math.min(100, limit));

      // Build base query
      let query = db.select().from(aiInteractions);

      // Apply cursor filtering if provided
      if (cursor) {
        const cursorData = CursorUtils.decode(cursor);
        if (!cursorData) {
          throw new Error('Invalid cursor format');
        }

        const cursorTimestamp = new Date(cursorData.timestamp);

        // Apply cursor condition based on sort direction
        if (sort.direction === 'desc') {
          query = query.where(
            and(
              lt(aiInteractions.createdAt, cursorTimestamp),
              // For timestamp ties, use ID comparison for stable ordering
              sql`${aiInteractions.id}::text < ${cursorData.id}`
            )
          );
        } else {
          query = query.where(
            and(
              gt(aiInteractions.createdAt, cursorTimestamp),
              // For timestamp ties, use ID comparison for stable ordering
              sql`${aiInteractions.id}::text > ${cursorData.id}`
            )
          );
        }
      }

      // Apply sorting based on configuration
      const orderByField = this.getSortField(sort);
      const orderDirection = sort.direction === 'desc' ? desc : asc;

      query = query
        .orderBy(orderDirection(orderByField), orderDirection(aiInteractions.id))
        .limit(safeLimit + 1); // Fetch one extra to check if there are more results

      // Execute query
      const results = await query;

      // Check if there are more results
      const hasMore = results.length > safeLimit;
      const messages = results.slice(0, safeLimit);

      // Transform database records to display format
      const displayMessages = messages.map(transformAiInteractionToDisplay);

      // Generate next cursor if there are more results
      let nextCursor: string | undefined;
      if (hasMore && displayMessages.length > 0) {
        const lastMessage = displayMessages[displayMessages.length - 1];
        nextCursor = CursorUtils.encode(lastMessage.createdAt, lastMessage.id);
      }

      return {
        messages: displayMessages,
        limit: safeLimit,
        nextCursor,
        hasMore,
        sort,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve messages with cursor pagination: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Maps sort field names to database column references.
   *
   * @param sort - Sort configuration
   * @returns Drizzle column reference for the sort field
   * @private
   */
  private static getSortField(sort: MessageSort) {
    switch (sort.field) {
      case 'createdAt':
        return aiInteractions.createdAt;
      case 'model':
        return aiInteractions.model;
      case 'totalTokens':
        return aiInteractions.totalTokens;
      case 'responseTime':
        return aiInteractions.responseTimeMs;
      default:
        return aiInteractions.createdAt;
    }
  }
}