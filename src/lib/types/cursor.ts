/**
 * Supported sort fields for message queries.
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
  field: MessageSortField;
  direction: MessageSortDirection;
}

/**
 * Parameters for cursor-based pagination.
 */
export interface MessagesCursorPaginationParams {
  limit: number;
  cursor?: string;
  sort: MessageSort;
}

/**
 * Cursor utilities.
 */
export const CursorUtils = {
  encode(createdAt: Date, id: string): string {
    return Buffer.from(JSON.stringify({ timestamp: createdAt.getTime(), id })).toString('base64');
  },

  decode(cursor: string): { timestamp: number; id: string } | null {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      return parsed.timestamp && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  },
};