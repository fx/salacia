import type { MessageSort, MessageSortField, MessageSortDirection } from '../types/cursor.js';

/**
 * URL parameter names for cursor pagination.
 */
export const URL_PARAMS = {
  CURSOR: 'cursor',
  LIMIT: 'limit',
  SORT_FIELD: 'sortField',
  SORT_DIRECTION: 'sortDirection',
} as const;

/**
 * Default values for pagination parameters.
 */
export const DEFAULT_VALUES = {
  LIMIT: 20,
  SORT_FIELD: 'createdAt' as MessageSortField,
  SORT_DIRECTION: 'desc' as MessageSortDirection,
} as const;

/**
 * Parses URL search parameters into cursor pagination parameters.
 */
export function parseUrlCursorParams(searchParams: URLSearchParams) {
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get(URL_PARAMS.LIMIT) || '20', 10)));
  const cursor = searchParams.get(URL_PARAMS.CURSOR) || undefined;
  const sortField = (searchParams.get(URL_PARAMS.SORT_FIELD) || DEFAULT_VALUES.SORT_FIELD) as MessageSortField;
  const sortDirection = (searchParams.get(URL_PARAMS.SORT_DIRECTION) || DEFAULT_VALUES.SORT_DIRECTION) as MessageSortDirection;

  return {
    limit,
    cursor,
    sort: { field: sortField, direction: sortDirection } as MessageSort,
  };
}

/**
 * Serializes cursor pagination parameters to URL search parameters.
 */
export function serializeCursorParams(params: {
  limit?: number;
  cursor?: string;
  sort?: MessageSort;
}): URLSearchParams {
  const urlParams = new URLSearchParams();
  
  if (params.limit && params.limit !== DEFAULT_VALUES.LIMIT) {
    urlParams.set(URL_PARAMS.LIMIT, params.limit.toString());
  }
  if (params.cursor) {
    urlParams.set(URL_PARAMS.CURSOR, params.cursor);
  }
  if (params.sort?.field && params.sort.field !== DEFAULT_VALUES.SORT_FIELD) {
    urlParams.set(URL_PARAMS.SORT_FIELD, params.sort.field);
  }
  if (params.sort?.direction && params.sort.direction !== DEFAULT_VALUES.SORT_DIRECTION) {
    urlParams.set(URL_PARAMS.SORT_DIRECTION, params.sort.direction);
  }
  
  return urlParams;
}