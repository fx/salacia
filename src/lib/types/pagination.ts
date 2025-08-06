/**
 * Cursor-based pagination types and utilities.
 * Provides type-safe cursor pagination for efficient data loading.
 */

/**
 * Supported sort fields for AI interactions pagination.
 */
export type SortField = 'createdAt' | 'model' | 'totalTokens' | 'responseTime';

/**
 * Sort direction for pagination queries.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Cursor pagination request parameters.
 */
export interface CursorPaginationRequest {
  /** Number of items to fetch (max 100) */
  limit?: number;
  /** Cursor for next page (encoded) */
  cursor?: string;
  /** Field to sort by */
  sortBy?: SortField;
  /** Sort direction */
  sortDirection?: SortDirection;
}

/**
 * Cursor pagination response structure.
 */
export interface CursorPaginationResponse<T> {
  /** Array of data items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Next page cursor (if available) */
    nextCursor?: string;
    /** Previous page cursor (if available) */
    prevCursor?: string;
    /** Whether there are more items */
    hasNext: boolean;
    /** Whether there are previous items */
    hasPrev: boolean;
    /** Number of items returned */
    count: number;
  };
}

/**
 * Internal cursor structure (before encoding).
 */
export interface CursorData {
  /** Field value at cursor position */
  value: string | number | Date;
  /** Unique identifier for tie-breaking */
  id: string;
  /** Sort field */
  field: SortField;
  /** Sort direction */
  direction: SortDirection;
}

/**
 * Validated pagination parameters with defaults.
 */
export interface ValidatedPaginationParams {
  limit: number;
  sortBy: SortField;
  sortDirection: SortDirection;
  cursor?: CursorData;
}