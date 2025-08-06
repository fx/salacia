import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  MessagesCursorPaginationParams,
  MessagesCursorPaginationResponse,
} from '../types/cursor.js';
import type { MessageDisplay, MessagesFilterParams } from '../types/messages.js';
import { MessagesClient } from '../api/messages.js';

/**
 * React hook for managing paginated message data with cursor pagination.
 * Provides automatic data fetching, loading states, and error handling.
 *
 * @param initialParams - Initial pagination parameters
 * @param initialFilters - Initial filter parameters
 * @returns Object containing messages data, loading state, error, and control functions
 */
export function useMessages(
  initialParams: MessagesCursorPaginationParams = {},
  initialFilters: MessagesFilterParams = {}
) {
  const [data, setData] = useState<MessagesCursorPaginationResponse<MessageDisplay> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState<MessagesCursorPaginationParams>({
    limit: 20,
    sortBy: 'createdAt',
    sortDirection: 'desc',
    ...initialParams,
  });
  const [filters, setFilters] = useState<MessagesFilterParams>(initialFilters);

  // Memoize the client to prevent recreating on every render
  const client = useMemo(() => new MessagesClient(), []);

  /**
   * Fetches messages from the API with current parameters and filters.
   */
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.getMessagesWithCursor(params, filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client, params, filters]);

  /**
   * Navigates to the next page of results.
   */
  const nextPage = useCallback(() => {
    if (data?.cursors.next) {
      setParams(prev => ({ ...prev, cursor: data.cursors.next }));
    }
  }, [data?.cursors.next]);

  /**
   * Navigates to the previous page of results.
   */
  const prevPage = useCallback(() => {
    if (data?.cursors.prev) {
      setParams(prev => ({ ...prev, cursor: data.cursors.prev }));
    }
  }, [data?.cursors.prev]);

  /**
   * Resets pagination to the first page.
   */
  const resetPagination = useCallback(() => {
    setParams(prev => ({ ...prev, cursor: undefined }));
  }, []);

  /**
   * Updates pagination parameters.
   */
  const updateParams = useCallback((newParams: Partial<MessagesCursorPaginationParams>) => {
    setParams(prev => ({ ...prev, ...newParams, cursor: undefined }));
  }, []);

  /**
   * Updates filter parameters.
   */
  const updateFilters = useCallback((newFilters: Partial<MessagesFilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setParams(prev => ({ ...prev, cursor: undefined }));
  }, []);

  /**
   * Refreshes the current page of data.
   */
  const refresh = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Fetch messages when parameters or filters change
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    data,
    loading,
    error,
    nextPage,
    prevPage,
    resetPagination,
    updateParams,
    updateFilters,
    refresh,
    hasNext: data?.meta.hasMore ?? false,
    hasPrev: !!params.cursor,
  };
}
