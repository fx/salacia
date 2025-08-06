/**
 * Custom hook for managing message data with cursor-based pagination and real-time updates.
 *
 * This hook provides a comprehensive interface for fetching, filtering, and managing
 * message data with support for both traditional offset pagination and efficient
 * cursor-based pagination for real-time scenarios.
 *
 * Features:
 * - Cursor-based pagination for efficient large dataset handling
 * - Real-time message updates (extensible for SSE integration)
 * - Loading states and error handling
 * - Automatic data deduplication
 * - Filter and sort management
 *
 * @module useMessages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MessageDisplay,
  MessagesCursorPaginationParams,
  MessagesCursorPaginatedResult,
  MessagesFilterParams,
  MessageSort,
} from '../lib/types/messages.js';
import { messagesClient, MessagesApiError } from '../lib/api/messages-client.js';

/**
 * State interface for the useMessages hook.
 */
export interface UseMessagesState {
  /** Current messages data */
  messages: MessageDisplay[];
  /** Loading state for initial or refresh requests */
  isLoading: boolean;
  /** Loading state for loading more messages (pagination) */
  isLoadingMore: boolean;
  /** Current error state */
  error: string | null;
  /** Whether there are more messages to load */
  hasMore: boolean;
  /** Current cursor for pagination */
  nextCursor?: string;
  /** Applied filters */
  filters: MessagesFilterParams;
  /** Applied sort configuration */
  sort: MessageSort;
  /** Message statistics */
  stats?: MessagesCursorPaginatedResult['stats'];
}

/**
 * Configuration for the useMessages hook.
 */
export interface UseMessagesConfig {
  /** Number of messages to load per request (default: 100) */
  limit?: number;
  /** Initial sort configuration */
  initialSort?: MessageSort;
  /** Initial filter configuration */
  initialFilters?: MessagesFilterParams;
  /** Whether to automatically fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Whether to enable real-time updates (default: false) */
  enableRealtime?: boolean;
}

/**
 * Return type for the useMessages hook.
 */
export interface UseMessagesReturn extends UseMessagesState {
  /** Fetch initial messages or refresh current data */
  fetchMessages: () => Promise<void>;
  /** Load more messages using cursor pagination */
  loadMore: () => Promise<void>;
  /** Update filters and refetch data */
  updateFilters: (_filters: MessagesFilterParams) => Promise<void>;
  /** Update sort and refetch data */
  updateSort: (_sort: MessageSort) => Promise<void>;
  /** Clear all messages and reset state */
  clear: () => void;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Add new messages (for real-time updates) */
  addMessages: (_messages: MessageDisplay[]) => void;
}

/**
 * Default configuration for the useMessages hook.
 */
const DEFAULT_CONFIG: Required<UseMessagesConfig> = {
  limit: 100,
  initialSort: { field: 'createdAt', direction: 'desc' },
  initialFilters: {},
  autoFetch: true,
  enableRealtime: false,
};

/**
 * Custom hook for managing messages with cursor-based pagination.
 *
 * @param config - Hook configuration options
 * @returns Hook state and methods for message management
 */
export function useMessages(config: UseMessagesConfig = {}): UseMessagesReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Refs for stable references
  const configRef = useRef(finalConfig);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = { ...DEFAULT_CONFIG, ...config };
  }, [config]);

  // State management
  const [state, setState] = useState<UseMessagesState>({
    messages: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasMore: false,
    nextCursor: undefined,
    filters: finalConfig.initialFilters,
    sort: finalConfig.initialSort,
    stats: undefined,
  });

  /**
   * Aborts any pending requests.
   */
  const abortPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Deduplicates messages by ID, keeping the latest version of each message.
   */
  const deduplicateMessages = useCallback(
    (messages: MessageDisplay[]): MessageDisplay[] => {
      const messageMap = new Map<string, MessageDisplay>();

      for (const message of messages) {
        const existing = messageMap.get(message.id);
        if (!existing || message.createdAt >= existing.createdAt) {
          messageMap.set(message.id, message);
        }
      }

      // Return sorted by creation date (newest first for desc sort)
      return Array.from(messageMap.values()).sort((a, b) => {
        if (state.sort.direction === 'desc') {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    },
    [state.sort.direction]
  );

  /**
   * Fetches messages from the API with current configuration.
   */
  const fetchMessagesInternal = useCallback(
    async (cursor?: string, isLoadMore = false): Promise<void> => {
      const currentConfig = configRef.current;

      // Abort any pending request
      abortPendingRequest();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        [isLoadMore ? 'isLoadingMore' : 'isLoading']: true,
        error: null,
      }));

      try {
        const paginationParams: MessagesCursorPaginationParams = {
          limit: currentConfig.limit,
          cursor,
          sort: state.sort,
        };

        const result = await messagesClient.getMessagesCursor(paginationParams, state.filters);

        setState(prev => ({
          ...prev,
          messages: isLoadMore
            ? deduplicateMessages([...prev.messages, ...result.messages])
            : result.messages,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          stats: result.stats,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        }));
      } catch (error) {
        // Don't update state if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const errorMessage =
          error instanceof MessagesApiError
            ? error.message
            : 'Failed to load messages. Please try again.';

        setState(prev => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          error: errorMessage,
        }));
      } finally {
        abortControllerRef.current = null;
      }
    },
    [state.sort, state.filters, abortPendingRequest, deduplicateMessages]
  );

  /**
   * Fetch initial messages or refresh current data.
   */
  const fetchMessages = useCallback(async (): Promise<void> => {
    await fetchMessagesInternal(undefined, false);
  }, [fetchMessagesInternal]);

  /**
   * Load more messages using cursor pagination.
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.isLoadingMore || !state.nextCursor) {
      return;
    }

    await fetchMessagesInternal(state.nextCursor, true);
  }, [fetchMessagesInternal, state.hasMore, state.isLoadingMore, state.nextCursor]);

  /**
   * Update filters and refetch data.
   */
  const updateFilters = useCallback(
    async (filters: MessagesFilterParams): Promise<void> => {
      setState(prev => ({
        ...prev,
        filters,
        messages: [], // Clear existing messages when filters change
        nextCursor: undefined,
        hasMore: false,
      }));

      // Wait for state update to complete, then fetch
      setTimeout(async () => {
        await fetchMessagesInternal(undefined, false);
      }, 0);
    },
    [fetchMessagesInternal]
  );

  /**
   * Update sort and refetch data.
   */
  const updateSort = useCallback(
    async (sort: MessageSort): Promise<void> => {
      setState(prev => ({
        ...prev,
        sort,
        messages: [], // Clear existing messages when sort changes
        nextCursor: undefined,
        hasMore: false,
      }));

      // Wait for state update to complete, then fetch
      setTimeout(async () => {
        await fetchMessagesInternal(undefined, false);
      }, 0);
    },
    [fetchMessagesInternal]
  );

  /**
   * Clear all messages and reset state.
   */
  const clear = useCallback((): void => {
    abortPendingRequest();
    setState(prev => ({
      ...prev,
      messages: [],
      nextCursor: undefined,
      hasMore: false,
      error: null,
      isLoading: false,
      isLoadingMore: false,
      stats: undefined,
    }));
  }, [abortPendingRequest]);

  /**
   * Retry after error.
   */
  const retry = useCallback(async (): Promise<void> => {
    if (state.messages.length === 0) {
      await fetchMessages();
    } else {
      // If we have messages, try to load more
      await loadMore();
    }
  }, [state.messages.length, fetchMessages, loadMore]);

  /**
   * Add new messages (for real-time updates).
   */
  const addMessages = useCallback(
    (newMessages: MessageDisplay[]): void => {
      setState(prev => ({
        ...prev,
        messages: deduplicateMessages([...newMessages, ...prev.messages]),
      }));
    },
    [deduplicateMessages]
  );

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (configRef.current.autoFetch && state.messages.length === 0) {
      fetchMessages();
    }
  }, []); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortPendingRequest();
    };
  }, [abortPendingRequest]);

  return {
    ...state,
    fetchMessages,
    loadMore,
    updateFilters,
    updateSort,
    clear,
    retry,
    addMessages,
  };
}
