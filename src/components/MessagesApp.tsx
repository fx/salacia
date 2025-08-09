/**
 * MessagesApp main component that coordinates the messages interface.
 *
 * This component serves as the main container for the messages interface,
 * managing state, data fetching, and coordinating between the table,
 * filters, and pagination components.
 *
 * Features:
 * - Manages messages data state and loading states
 * - Coordinates filtering, sorting, and pagination
 * - Handles error states and recovery
 * - Provides real-time updates via API calls
 * - Integrates all sub-components seamlessly
 *
 * @module MessagesApp
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MessagesTable } from './MessagesTable.js';
import { Pagination } from './Pagination.js';
import { SearchAndFilters } from './SearchAndFilters.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { messagesClient, MessagesApiError } from '../lib/api/messages-client.js';
import { useRealtime } from '../context/realtime.js';
import type {
  MessagesPaginatedResult,
  MessagesPaginationParams,
  MessagesFilterParams,
  MessageSort,
  MessageDisplay,
} from '../lib/types/messages.js';

/**
 * Props for the MessagesApp component.
 */
export interface MessagesAppProps {
  /** Initial messages data from server-side rendering */
  initialMessages: MessagesPaginatedResult;
  /** Initial error state if server-side loading failed */
  initialError: string | null;
  /** Default pagination parameters */
  defaultPagination: MessagesPaginationParams;
  /** Default filter parameters */
  defaultFilters: MessagesFilterParams;
}

/**
 * Main state interface for the messages application.
 */
interface MessagesAppState {
  /** Current messages data */
  data: MessagesPaginatedResult | null;
  /** Current loading state */
  isLoading: boolean;
  /** Current error state */
  error: string | null;
  /** Current pagination parameters */
  pagination: MessagesPaginationParams;
  /** Current filter parameters */
  filters: MessagesFilterParams;
  /** Whether there are new messages available */
  hasNewMessages: boolean;
}

/**
 * MessagesApp component that provides the complete messages interface.
 * Manages state and coordinates between all sub-components.
 *
 * @param props - Component props
 * @returns JSX element representing the messages application
 */
export function MessagesApp({
  initialMessages,
  initialError,
  defaultPagination,
  defaultFilters,
}: MessagesAppProps): React.ReactElement {
  // Main application state
  const [state, setState] = useState<MessagesAppState>({
    data: initialError ? null : initialMessages,
    isLoading: false,
    error: initialError,
    pagination: defaultPagination,
    filters: defaultFilters,
    hasNewMessages: false,
  });

  const { messages: realtimeMessages } = useRealtime();

  /**
   * Fetches messages with current pagination and filter parameters.
   * Updates loading and error states appropriately.
   */
  const fetchMessages = useCallback(
    async (paginationParams: MessagesPaginationParams, filterParams: MessagesFilterParams) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await messagesClient.getMessages(paginationParams, filterParams);
        setState(prev => ({
          ...prev,
          data: result,
          isLoading: false,
          error: null,
          pagination: paginationParams,
          filters: filterParams,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof MessagesApiError
            ? error.message
            : 'Failed to load messages. Please try again.';

        setState(prev => ({
          ...prev,
          data: null,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    []
  );

  /**
   * Handles page changes from pagination component.
   */
  const handlePageChange = useCallback(
    (page: number) => {
      const newPagination = { ...state.pagination, page };
      fetchMessages(newPagination, state.filters);
    },
    [state.pagination, state.filters, fetchMessages]
  );

  /**
   * Handles sort changes from table component.
   */
  const handleSortChange = useCallback(
    (sort: MessageSort) => {
      const newPagination = { ...state.pagination, sort, page: 1 }; // Reset to page 1 on sort
      fetchMessages(newPagination, state.filters);
    },
    [state.pagination, state.filters, fetchMessages]
  );

  /**
   * Handles filter changes from filters component.
   */
  const handleFiltersChange = useCallback(
    (filters: MessagesFilterParams) => {
      const newPagination = { ...state.pagination, page: 1 }; // Reset to page 1 on filter change
      fetchMessages(newPagination, filters);
    },
    [state.pagination, fetchMessages]
  );

  /**
   * Handles retry after error.
   */
  const handleRetry = useCallback(() => {
    fetchMessages(state.pagination, state.filters);
  }, [state.pagination, state.filters, fetchMessages]);

  /**
   * Handles clearing new messages indicator.
   */
  const handleClearNewMessages = useCallback(() => {
    setState(prev => ({ ...prev, hasNewMessages: false }));
    // Optionally refresh to show the new messages
    if (state.pagination.page === 1) {
      fetchMessages(state.pagination, state.filters);
    }
  }, [state.pagination, state.filters, fetchMessages]);

  /**
   * Merge realtime messages with current data for display.
   * Only applies to the first page to maintain pagination consistency.
   */
  const displayMessages = useMemo(() => {
    if (!state.data?.messages) return [];

    // Only merge realtime messages on the first page
    if (state.pagination.page !== 1 || realtimeMessages.length === 0) {
      return state.data.messages;
    }

    // Create a map for deduplication
    const messageMap = new Map<string, MessageDisplay>();

    // Add realtime messages first (newest)
    realtimeMessages.forEach(msg => messageMap.set(msg.id, msg));

    // Add existing messages (avoid duplicates)
    state.data.messages.forEach(msg => {
      if (!messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });

    // Convert back to array and limit to page size
    return Array.from(messageMap.values()).slice(0, state.data.pageSize);
  }, [state.data, state.pagination.page, realtimeMessages]);

  /**
   * Track when new realtime messages arrive on non-first pages.
   */
  useEffect(() => {
    if (realtimeMessages.length > 0 && state.pagination.page !== 1) {
      setState(prev => ({ ...prev, hasNewMessages: true }));
    }
  }, [realtimeMessages.length, state.pagination.page]);

  // Extract available models and providers for filter dropdowns
  const availableModels = state.data?.messages
    ? Array.from(new Set(state.data.messages.map(msg => msg.model))).sort()
    : [];

  const availableProviders = state.data?.messages
    ? Array.from(
        new Set(state.data.messages.map(msg => msg.provider).filter((p): p is string => Boolean(p)))
      ).sort()
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Search and Filters section */}
      <ErrorBoundary context="Search and Filters">
        <SearchAndFilters
          filters={state.filters}
          onFiltersChange={handleFiltersChange}
          availableModels={availableModels}
          availableProviders={availableProviders}
          disabled={state.isLoading}
        />
      </ErrorBoundary>

      {/* Main content area */}
      <div>
        {/* Error state */}
        {state.error && (
          <div style={{ textAlign: 'center' }} role="alert" aria-live="polite">
            <div>
              <h3>Error Loading Messages</h3>
              <p>
                <small>{state.error}</small>
              </p>
            </div>
            <button onClick={handleRetry} is-="button" variant-="primary" type="button">
              Try Again
            </button>
          </div>
        )}

        {/* New messages notification for non-first pages */}
        {state.hasNewMessages && state.pagination.page !== 1 && (
          <div
            style={{
              padding: '1ch 2ch',
              backgroundColor: 'var(--wui-color-surface)',
              borderBottom: '1px solid var(--wui-color-border)',
              textAlign: 'center',
            }}
            role="alert"
            aria-live="polite"
          >
            <span style={{ color: 'var(--wui-color-green)' }}>● </span>
            New messages available.{' '}
            <button
              onClick={() => handlePageChange(1)}
              is-="button"
              variant-="text"
              size-="small"
              type="button"
            >
              Go to first page
            </button>
          </div>
        )}

        {/* Messages table */}
        {!state.error && (
          <ErrorBoundary context="Messages Table">
            <MessagesTable
              messages={displayMessages}
              isLoading={state.isLoading}
              error={null} // Errors are handled at the app level
              sort={state.pagination.sort}
              onSortChange={handleSortChange}
            />
          </ErrorBoundary>
        )}

        {/* Pagination */}
        {!state.error && state.data && (
          <ErrorBoundary context="Pagination">
            <Pagination
              currentPage={state.data.currentPage}
              totalPages={state.data.totalPages}
              totalItems={state.data.totalItems}
              pageSize={state.data.pageSize}
              onPageChange={handlePageChange}
              disabled={state.isLoading}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Loading overlay for better UX */}
      {state.isLoading && (
        <div
          style={{
            position: 'fixed',
            inset: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '50',
          }}
          role="status"
          aria-live="polite"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1ch' }}>
            <span>Loading messages...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessagesApp;
