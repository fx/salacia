import { desc, asc, and, lt, gt, sql } from 'drizzle-orm';
import type { MessagesCursorPaginationParams } from '../types/cursor.js';
import type { MessagesCursorPaginatedResult } from '../types/messages.js';
import { transformAiInteractionToDisplay } from '../types/messages.js';
import { CursorUtils } from '../types/cursor.js';
import { aiInteractions } from '../db/schema.js';
import { db } from '../db/connection.js';

/**
 * Service for AI message interactions.
 */
export class MessagesService {
  /**
   * Get messages with cursor pagination.
   */
  static async getMessagesCursor(
    params: MessagesCursorPaginationParams
  ): Promise<MessagesCursorPaginatedResult> {
    const { limit, cursor, sort } = params;
    const safeLimit = Math.max(1, Math.min(100, limit));

    let query = db.select().from(aiInteractions);

    // Apply cursor filtering
    if (cursor) {
      const cursorData = CursorUtils.decode(cursor);
      if (!cursorData) throw new Error('Invalid cursor');

      const cursorTimestamp = new Date(cursorData.timestamp);
      
      if (sort.direction === 'desc') {
        query = query.where(
          and(
            lt(aiInteractions.createdAt, cursorTimestamp),
            sql`${aiInteractions.id}::text < ${cursorData.id}`
          )
        );
      } else {
        query = query.where(
          and(
            gt(aiInteractions.createdAt, cursorTimestamp),
            sql`${aiInteractions.id}::text > ${cursorData.id}`
          )
        );
      }
    }

    // Apply sorting
    const orderDirection = sort.direction === 'desc' ? desc : asc;
    query = query
      .orderBy(orderDirection(aiInteractions.createdAt), orderDirection(aiInteractions.id))
      .limit(safeLimit + 1);

    const results = await query;
    const hasMore = results.length > safeLimit;
    const messages = results.slice(0, safeLimit).map(transformAiInteractionToDisplay);

    let nextCursor: string | undefined;
    if (hasMore && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      nextCursor = CursorUtils.encode(lastMessage.createdAt, lastMessage.id);
    }

    return {
      messages,
      limit: safeLimit,
      nextCursor,
      hasMore,
      sort,
    };
  }
}