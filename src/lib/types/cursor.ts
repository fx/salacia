/**
 * Supported sort fields for message queries.
 * Defines which fields can be used for ordering results.
 */
export type MessageSortField = 'createdAt' | 'model' | 'totalTokens' | 'responseTime';

/**
 * Sort direction for message queries.
 */
export type MessageSortDirection = 'asc' | 'desc';

/**
 * Sort configuration for message queries.
 */
export interface MessageSort {
  /** Field to sort by */
  field: MessageSortField;
  /** Sort direction */
  direction: MessageSortDirection;
}

/**
 * Parameters for cursor-based pagination of message queries.
 * Provides efficient pagination for large datasets and real-time updates.
 */
export interface MessagesCursorPaginationParams {
  /** Number of items per page (1-100) */
  limit: number;
  /** Cursor for pagination (timestamp + id for uniqueness) */
  cursor?: string;
  /** Sort configuration - cursor pagination typically uses createdAt desc for newest first */
  sort: MessageSort;
}

/**
 * Utility functions for cursor-based pagination.
 */
export const CursorUtils = {
  /**
   * Creates a cursor from a message's timestamp and ID.
   * Combines createdAt timestamp and id for stable, unique pagination.
   *
   * @param createdAt - Timestamp of the message
   * @param id - Unique ID of the message
   * @returns Base64 encoded cursor string
   */
  encode(createdAt: Date, id: string): string {
    const cursorData = {
      timestamp: createdAt.getTime(),
      id,
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  },

  /**
   * Decodes a cursor string into timestamp and ID components.
   *
   * @param cursor - Base64 encoded cursor string
   * @returns Decoded cursor data or null if invalid
   */
  decode(cursor: string): { timestamp: number; id: string } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);

      if (typeof parsed.timestamp === 'number' && typeof parsed.id === 'string') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },
};