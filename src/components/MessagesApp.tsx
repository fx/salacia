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

import React, { useState, useCallback } from 'react';
import { MessagesTable } from './MessagesTable.js';
import { Pagination } from './Pagination.js';
import { TableFilters } from './TableFilters.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { messagesClient, MessagesApiError } from '../lib/api/messages-client.js';
import type {
  MessagesPaginatedResult,
  MessagesPaginationParams,
  MessagesFilterParams,
  MessageSort,
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
  });

  /**
   * Fetches messages with current pagination and filter parameters.
   * Updates loading and error states appropriately.
   */
  const fetchMessages = useCallback(async (
    paginationParams: MessagesPaginationParams,
    filterParams: MessagesFilterParams
  ) => {
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
      const errorMessage = error instanceof MessagesApiError 
        ? error.message 
        : 'Failed to load messages. Please try again.';
      
      setState(prev => ({
        ...prev,
        data: null,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Handles page changes from pagination component.
   */
  const handlePageChange = useCallback((page: number) => {
    const newPagination = { ...state.pagination, page };
    fetchMessages(newPagination, state.filters);
  }, [state.pagination, state.filters, fetchMessages]);

  /**
   * Handles sort changes from table component.
   */
  const handleSortChange = useCallback((sort: MessageSort) => {
    const newPagination = { ...state.pagination, sort, page: 1 }; // Reset to page 1 on sort
    fetchMessages(newPagination, state.filters);
  }, [state.pagination, state.filters, fetchMessages]);

  /**
   * Handles filter changes from filters component.
   */
  const handleFiltersChange = useCallback((filters: MessagesFilterParams) => {
    const newPagination = { ...state.pagination, page: 1 }; // Reset to page 1 on filter change
    fetchMessages(newPagination, filters);
  }, [state.pagination, fetchMessages]);

  /**
   * Handles retry after error.
   */
  const handleRetry = useCallback(() => {
    fetchMessages(state.pagination, state.filters);
  }, [state.pagination, state.filters, fetchMessages]);

  // Extract available models and providers for filter dropdowns
  const availableModels = state.data?.messages
    ? Array.from(new Set(state.data.messages.map(msg => msg.model))).sort()
    : [];
  
  const availableProviders = state.data?.messages
    ? Array.from(new Set(state.data.messages.map(msg => msg.provider).filter((p): p is string => Boolean(p)))).sort()
    : [];

  return (
    <div data-webtui-messages="app" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2lh',
      fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace'
    }}>
      {/* Filters section */}
      <ErrorBoundary context="TABLE_FILTERS">
        <TableFilters
          filters={state.filters}
          onFiltersChange={handleFiltersChange}
          availableModels={availableModels}
          availableProviders={availableProviders}
          disabled={state.isLoading}
        />
      </ErrorBoundary>

      {/* Main content area */}
      <div data-webtui-messages="content" style={{
        backgroundColor: 'var(--webtui-color-surface-base)',
        borderRadius: '1ch',
        border: '1px solid var(--webtui-color-border)',
        overflow: 'hidden'
      }}>
        {/* Error state */}
        {state.error && (
          <div data-webtui-messages="error" style={{
            padding: '3lh 4ch',
            textAlign: 'center'
          }} role="alert" aria-live="polite">
            <div data-webtui-error="content" style={{
              color: 'var(--webtui-color-error)',
              marginBottom: '2lh'
            }}>
              <h3 data-webtui-text="error-title" style={{
                fontSize: '2ch',
                fontWeight: 'bold',
                marginBottom: '1lh'
              }}>
                ▲ MESSAGES LOADING FAILED
              </h3>
              <p data-webtui-text="error-detail" style={{
                fontSize: '1ch',
                opacity: 0.8
              }}>
                {state.error}
              </p>
            </div>
            <button
              onClick={handleRetry}
              data-webtui-button="retry"
              type="button"
              style={{
                padding: '1lh 3ch',
                backgroundColor: 'var(--webtui-color-primary)',
                color: 'var(--webtui-color-primary-contrast)',
                border: 'none',
                borderRadius: '0.5ch',
                fontSize: '1ch',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              [RETRY_LOAD]
            </button>
          </div>
        )}

        {/* Messages table */}
        {!state.error && (
          <ErrorBoundary context="MESSAGES_TABLE">
            <MessagesTable
              messages={state.data?.messages || []}
              isLoading={state.isLoading}
              error={null} // Errors are handled at the app level
              sort={state.pagination.sort}
              onSortChange={handleSortChange}
            />
          </ErrorBoundary>
        )}

        {/* Pagination */}
        {!state.error && state.data && (
          <ErrorBoundary context="PAGINATION">
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
          data-webtui-loading="overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace'
          }}
          role="status"
          aria-live="polite"
        >
          <div data-webtui-loading="dialog" style={{
            backgroundColor: 'var(--webtui-color-surface-base)',
            borderRadius: '1ch',
            padding: '2lh 4ch',
            border: '1px solid var(--webtui-color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '2ch'
          }}>
            <div data-webtui-loading="spinner" style={{
              width: '2ch',
              height: '2ch',
              border: '2px solid var(--webtui-color-border)',
              borderTop: '2px solid var(--webtui-color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span data-webtui-loading="text" style={{
              color: 'var(--webtui-color-text-primary)',
              fontSize: '1ch'
            }}>
              LOADING_MESSAGES...
            </span>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default MessagesApp;