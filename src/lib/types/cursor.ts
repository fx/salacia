import { z } from 'zod';

/**
 * Base64 encoding/decoding utilities for browser and Node.js environments.
 * Includes error handling for malformed input and cross-environment compatibility.
 */
const base64 = {
  encode(str: string): string {
    try {
      // Browser environment
      if (typeof btoa !== 'undefined') {
        // eslint-disable-next-line no-undef
        return btoa(str);
      }
      // Node.js environment
      if (typeof Buffer !== 'undefined') {
        // eslint-disable-next-line no-undef
        return Buffer.from(str).toString('base64');
      }
      throw new Error('Base64 encoding not available in this environment');
    } catch (error) {
      throw new Error(
        `Base64 encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
  decode(str: string): string {
    try {
      // Validate base64 string format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
        throw new Error('Invalid base64 string format');
      }

      // Browser environment
      if (typeof atob !== 'undefined') {
        // eslint-disable-next-line no-undef
        return atob(str);
      }
      // Node.js environment
      if (typeof Buffer !== 'undefined') {
        // eslint-disable-next-line no-undef
        return Buffer.from(str, 'base64').toString('utf-8');
      }
      throw new Error('Base64 decoding not available in this environment');
    } catch (error) {
      throw new Error(
        `Base64 decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};

/**
 * Supported fields for sorting messages in cursor pagination.
 * These fields must be present and indexed in the database for efficient queries.
 */
export type MessageSortField = 'createdAt' | 'id';

/**
 * Cursor data structure for message pagination.
 * Contains all necessary information to resume pagination from a specific point.
 */
export interface MessageCursorData {
  /** Timestamp when cursor was created (for expiration) */
  timestamp: number;
  /** Value of the sort field at this cursor position */
  sortFieldValue: string | number;
  /** Name of the field being sorted on */
  sortField: MessageSortField;
  /** Unique identifier of the item at cursor position */
  id: string;
}

/**
 * Zod schema for validating cursor data structure.
 * Ensures type safety when decoding cursor strings.
 */
export const MessageCursorDataSchema = z.object({
  timestamp: z.number(),
  sortFieldValue: z.union([z.string(), z.number()]),
  sortField: z.enum(['createdAt', 'id']),
  id: z.string().uuid(),
});

/**
 * Parameters for cursor-based pagination requests.
 * Used in API endpoints and service layer for consistent pagination.
 */
export interface MessagesCursorPaginationParams {
  /** Maximum number of items to return */
  limit?: number;
  /** Encoded cursor string for pagination */
  cursor?: string;
  /** Field to sort results by */
  sortBy?: MessageSortField;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Response structure for cursor-paginated message queries.
 * Includes data, metadata, and navigation cursors.
 */
export interface MessagesCursorPaginationResponse<T> {
  /** Array of items for current page */
  data: T[];
  /** Metadata about the current page */
  meta: {
    /** Number of items in current page */
    count: number;
    /** Maximum items per page */
    limit: number;
    /** Whether more items exist after this page */
    hasMore: boolean;
    /** Field used for sorting */
    sortBy: MessageSortField;
    /** Sort direction used */
    sortDirection: 'asc' | 'desc';
  };
  /** Cursors for navigation */
  cursors: {
    /** Cursor pointing to next page (if exists) */
    next?: string;
    /** Cursor pointing to previous page (if exists) */
    prev?: string;
  };
}

/**
 * Utility functions for cursor encoding and decoding.
 * Handles base64 encoding of cursor data for URL-safe transmission.
 */
export const CursorUtils = {
  /**
   * Encodes cursor data into a URL-safe string.
   * @param sortValue - Value of the sort field
   * @param id - Unique identifier
   * @param field - Field being sorted on
   * @returns Base64 encoded cursor string
   */
  encode(sortValue: Date | string | number, id: string, field: MessageSortField): string {
    const cursorData: MessageCursorData = {
      timestamp: Date.now(),
      sortFieldValue: sortValue instanceof Date ? sortValue.getTime() : sortValue,
      sortField: field,
      id,
    };
    return base64.encode(JSON.stringify(cursorData));
  },

  /**
   * Decodes a cursor string back into cursor data.
   * @param cursor - Base64 encoded cursor string
   * @returns Decoded cursor data or null if invalid
   */
  decode(cursor: string): MessageCursorData | null {
    try {
      const decoded = base64.decode(cursor);
      const data = JSON.parse(decoded);
      return MessageCursorDataSchema.parse(data);
    } catch {
      return null;
    }
  },

  /**
   * Validates if a cursor is still valid (not expired).
   * @param cursor - Cursor string to validate
   * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   * @returns Whether cursor is valid
   */
  isValid(cursor: string, maxAgeMs = 3600000): boolean {
    const data = this.decode(cursor);
    if (!data) return false;
    return Date.now() - data.timestamp < maxAgeMs;
  },
};
