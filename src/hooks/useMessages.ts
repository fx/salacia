import { useState, useCallback, useEffect } from 'react';
import type { 
  MessageDisplay, 
  MessagesCursorPaginatedResult 
} from '../lib/types/messages.js';
import type { MessageSort } from '../lib/types/cursor.js';
import { MessagesClient } from '../lib/api/messages-client.js';

/**
 * Hook state interface for message management.
 */
export interface UseMessagesState {
  /** Current list of loaded messages */
  messages: MessageDisplay[];
  /** Whether data is currently being loaded */
  loading: boolean;
  /** Any error that occurred during loading */
  error: string | null;
  /** Whether there are more messages available to load */
  hasMore: boolean;
  /** Current sort configuration */
  sort: MessageSort;
  /** Current cursor for pagination */
  cursor?: string;
}

/**
 * Hook actions interface for message management.
 */
export interface UseMessagesActions {
  /** Load initial messages or refresh the list */
  loadMessages: () => Promise<void>;
  /** Load more messages (append to current list) */
  loadMore: () => Promise<void>;
  /** Change sort order and reload messages */
  changeSort: (newSort: MessageSort) => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Return type for the useMessages hook.
 */
export type UseMessagesReturn = UseMessagesState & UseMessagesActions;

/**
 * Configuration options for the useMessages hook.
 */
export interface UseMessagesOptions {
  /** Number of messages to load per request */
  limit?: number;
  /** Initial sort configuration */
  initialSort?: MessageSort;
  /** Whether to auto-load messages on mount */
  autoLoad?: boolean;
}

/**
 * Default configuration values.
 */
const DEFAULT_OPTIONS: Required<UseMessagesOptions> = {
  limit: 20,
  initialSort: { field: 'createdAt', direction: 'desc' },
  autoLoad: true,
};

/**
 * React hook for managing message loading with cursor-based pagination.
 * Provides state management and actions for efficient message list handling.
 *
 * @param options - Configuration options for the hook
 * @returns State and actions for message management
 */
export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const client = new MessagesClient();

  // State management
  const [state, setState] = useState<UseMessagesState>({
    messages: [],
    loading: false,
    error: null,
    hasMore: false,
    sort: config.initialSort,
    cursor: undefined,
  });

  /**
   * Updates state with new data from API response.
   */
  const updateState = useCallback(
    (result: MessagesCursorPaginatedResult, append = false) => {
      setState(prevState => ({
        ...prevState,
        messages: append ? [...prevState.messages, ...result.messages] : result.messages,
        hasMore: result.hasMore,
        cursor: result.nextCursor,
        loading: false,
        error: null,
      }));
    },
    []
  );

  /**
   * Handles errors by updating state.
   */
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    setState(prevState => ({
      ...prevState,
      loading: false,
      error: errorMessage,
    }));
  }, []);

  /**
   * Loads initial messages or refreshes the current list.
   */
  const loadMessages = useCallback(async (): Promise<void> => {
    setState(prevState => ({ ...prevState, loading: true, error: null }));

    try {
      const result = await client.getMessagesCursor({
        limit: config.limit,
        sort: state.sort,
      });
      updateState(result, false);
    } catch (error) {
      handleError(error);
    }
  }, [client, config.limit, state.sort, updateState, handleError]);

  /**
   * Loads more messages and appends them to the current list.
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.loading || !state.cursor) {
      return;
    }

    setState(prevState => ({ ...prevState, loading: true, error: null }));

    try {
      const result = await client.getMessagesCursor({
        limit: config.limit,
        cursor: state.cursor,
        sort: state.sort,
      });
      updateState(result, true);
    } catch (error) {
      handleError(error);
    }
  }, [
    client,
    config.limit,
    state.hasMore,
    state.loading,
    state.cursor,
    state.sort,
    updateState,
    handleError,
  ]);

  /**
   * Changes the sort order and reloads messages.
   */
  const changeSort = useCallback(
    async (newSort: MessageSort): Promise<void> => {
      setState(prevState => ({
        ...prevState,
        sort: newSort,
        loading: true,
        error: null,
        cursor: undefined,
      }));

      try {
        const result = await client.getMessagesCursor({
          limit: config.limit,
          sort: newSort,
        });
        updateState(result, false);
      } catch (error) {
        handleError(error);
      }
    },
    [client, config.limit, updateState, handleError]
  );

  /**
   * Resets the hook to its initial state.
   */
  const reset = useCallback((): void => {
    setState({
      messages: [],
      loading: false,
      error: null,
      hasMore: false,
      sort: config.initialSort,
      cursor: undefined,
    });
  }, [config.initialSort]);

  // Auto-load messages on mount if enabled
  useEffect(() => {
    if (config.autoLoad) {
      loadMessages();
    }
  }, []); // Only run on mount

  return {
    // State
    ...state,
    // Actions
    loadMessages,
    loadMore,
    changeSort,
    reset,
  };
}