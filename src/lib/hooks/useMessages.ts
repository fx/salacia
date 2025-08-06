/**
 * useMessages React hook - Provides cursor-based pagination for AI interactions.
 * Handles loading states, error management, and efficient data fetching with memoization.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessagesClient, type ApiError } from '../api/MessagesClient.js';
import type {
  CursorPaginationRequest,
  CursorPaginationResponse,
  SortField,
  SortDirection,
} from '../types/pagination.js';
import type { AiInteraction } from '../db/schema.js';

/**
 * Hook configuration options.
 */
export interface UseMessagesConfig {
  /** Initial number of messages to load */
  initialLimit?: number;
  /** Initial sort field */
  initialSortBy?: SortField;
  /** Initial sort direction */
  initialSortDirection?: SortDirection;
  /** Whether to automatically load on mount */
  autoLoad?: boolean;
  /** Custom messages client instance */
  client?: MessagesClient;
}

/**
 * Hook loading states.
 */
export type LoadingState = 'idle' | 'loading' | 'loadingMore' | 'refreshing';

/**
 * Hook return value interface.
 */
export interface UseMessagesReturn {
  /** Current messages array */
  messages: AiInteraction[];
  /** Current loading state */
  loading: LoadingState;
  /** Current error (if any) */
  error: ApiError | null;
  /** Pagination metadata */
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    count: number;
  };
  /** Current sort configuration */
  sort: {
    sortBy: SortField;
    sortDirection: SortDirection;
  };
  /** Load initial messages */
  loadMessages: () => Promise<void>;
  /** Load more messages (append to existing) */
  loadMore: () => Promise<void>;
  /** Refresh messages (replace existing) */
  refresh: () => Promise<void>;
  /** Change sort parameters and reload */
  changeSortAndReload: (_sortBy: SortField, _sortDirection: SortDirection) => Promise<void>;
  /** Clear all messages and reset state */
  clear: () => void;
}

/**
 * React hook for managing AI interaction messages with cursor pagination.
 *
 * @param config Hook configuration options
 * @returns Hook state and control functions
 *
 * @example
 * ```tsx
 * function MessagesComponent() {
 *   const {
 *     messages,
 *     loading,
 *     error,
 *     pagination,
 *     loadMessages,
 *     loadMore,
 *     refresh,
 *     changeSortAndReload
 *   } = useMessages({
 *     initialLimit: 25,
 *     initialSortBy: 'createdAt',
 *     initialSortDirection: 'desc'
 *   });
 *
 *   useEffect(() => {
 *     loadMessages();
 *   }, [loadMessages]);
 *
 *   return (
 *     <div>
 *       {error && <div>Error: {error.error}</div>}
 *       {messages.map(msg => <div key={msg.id}>{msg.userMessage}</div>)}
 *       {pagination.hasNext && <button onClick={loadMore}>Load More</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessages(config: UseMessagesConfig = {}): UseMessagesReturn {
  const {
    initialLimit = 50,
    initialSortBy = 'createdAt',
    initialSortDirection = 'desc',
    autoLoad = false,
    client,
  } = config;

  // Memoize client instance
  const messagesClient = useMemo(() => client || new MessagesClient(), [client]);

  // State management
  const [messages, setMessages] = useState<AiInteraction[]>([]);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [pagination, setPagination] = useState({
    hasNext: false,
    hasPrev: false,
    count: 0,
  });
  const [sort, setSort] = useState({
    sortBy: initialSortBy,
    sortDirection: initialSortDirection,
  });

  /**
   * Handles API responses and updates state.
   */
  const handleResponse = useCallback(
    (response: CursorPaginationResponse<AiInteraction>, append = false) => {
      setMessages(prevMessages => (append ? [...prevMessages, ...response.data] : response.data));
      setNextCursor(response.pagination.nextCursor);
      setPagination({
        hasNext: response.pagination.hasNext,
        hasPrev: response.pagination.hasPrev,
        count: response.pagination.count,
      });
      setError(null);
    },
    []
  );

  /**
   * Handles API errors.
   */
  const handleError = useCallback((apiError: ApiError) => {
    setError(apiError);
    setLoading('idle');
  }, []);

  /**
   * Generic fetch function with error handling.
   */
  const fetchMessages = useCallback(
    async (
      params: CursorPaginationRequest,
      append = false,
      loadingState: LoadingState = 'loading'
    ) => {
      try {
        setLoading(loadingState);
        setError(null);

        const response = await messagesClient.getMessages({
          limit: initialLimit,
          sortBy: sort.sortBy,
          sortDirection: sort.sortDirection,
          ...params,
        });

        handleResponse(response, append);
      } catch (err) {
        handleError(err as ApiError);
      } finally {
        setLoading('idle');
      }
    },
    [messagesClient, initialLimit, sort, handleResponse, handleError]
  );

  /**
   * Loads initial messages (replaces current messages).
   */
  const loadMessages = useCallback(async () => {
    await fetchMessages({}, false, 'loading');
  }, [fetchMessages]);

  /**
   * Loads more messages (appends to current messages).
   */
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading !== 'idle') {
      return;
    }

    await fetchMessages(
      {
        cursor: nextCursor,
      },
      true,
      'loadingMore'
    );
  }, [fetchMessages, nextCursor, loading]);

  /**
   * Refreshes messages (replaces current messages).
   */
  const refresh = useCallback(async () => {
    await fetchMessages({}, false, 'refreshing');
  }, [fetchMessages]);

  /**
   * Changes sort parameters and reloads messages.
   */
  const changeSortAndReload = useCallback(
    async (sortBy: SortField, sortDirection: SortDirection) => {
      setSort({ sortBy, sortDirection });
      setMessages([]);
      setNextCursor(undefined);

      await fetchMessages(
        {
          sortBy,
          sortDirection,
        },
        false,
        'loading'
      );
    },
    [fetchMessages]
  );

  /**
   * Clears all messages and resets state.
   */
  const clear = useCallback(() => {
    setMessages([]);
    setLoading('idle');
    setError(null);
    setNextCursor(undefined);
    setPagination({ hasNext: false, hasPrev: false, count: 0 });
  }, []);

  /**
   * Auto-load on mount if enabled.
   */
  useEffect(() => {
    if (autoLoad) {
      loadMessages();
    }
  }, [autoLoad, loadMessages]);

  return {
    messages,
    loading,
    error,
    pagination,
    sort,
    loadMessages,
    loadMore,
    refresh,
    changeSortAndReload,
    clear,
  };
}
