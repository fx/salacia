/**
 * MessagesApp component using cursor-based pagination.
 *
 * This component provides the complete messages interface with efficient
 * cursor-based pagination for handling large datasets.
 */

import React from 'react';
import { MessagesTable } from './MessagesTable.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { useMessages } from '../lib/hooks/useMessages.js';
import type {
  MessagesCursorPaginationParams,
  MessagesCursorPaginationResponse,
} from '../lib/types/cursor.js';
import type { MessagesFilterParams, MessageDisplay, MessageSort } from '../lib/types/messages.js';

/**
 * Props for the MessagesAppCursor component.
 */
export interface MessagesAppCursorProps {
  /** Initial messages data from server-side rendering */
  initialMessages: MessagesCursorPaginationResponse<MessageDisplay>;
  /** Initial error state if server-side loading failed */
  initialError: string | null;
  /** Default pagination parameters */
  defaultPagination: MessagesCursorPaginationParams;
  /** Default filter parameters */
  defaultFilters: MessagesFilterParams;
}

/**
 * MessagesApp component with cursor-based pagination.
 */
export function MessagesAppCursor({
  initialMessages,
  initialError,
  defaultPagination,
  defaultFilters,
}: MessagesAppCursorProps): React.ReactElement {
  // Use the cursor pagination hook
  const {
    data,
    loading,
    error,
    nextPage,
    prevPage,
    resetPagination,
    updateParams,
    updateFilters,
    refresh,
    hasNext,
    hasPrev,
  } = useMessages(defaultPagination, defaultFilters);

  // Use initial data if no data loaded yet
  const displayData = data || initialMessages;
  const displayError = error?.message || initialError;

  /**
   * Handle page size change.
   */
  const handlePageSizeChange = (newPageSize: number) => {
    updateParams({ limit: newPageSize });
  };

  /**
   * Handle sort change.
   */
  const handleSortChange = (field: 'createdAt' | 'id', direction: 'asc' | 'desc') => {
    updateParams({ sortBy: field, sortDirection: direction });
  };

  /**
   * Handle filter change.
   */
  const handleFilterChange = (newFilters: MessagesFilterParams) => {
    updateFilters(newFilters);
  };

  return (
    <ErrorBoundary context="MessagesApp">
      <div>
        {/* Header with title and stats */}
        <header box-="round" shear-="bottom">
          <h1>AI Interaction Messages</h1>
          <p>
            <small>
              Showing {displayData.data.length} of{' '}
              {displayData.meta.hasMore ? 'many' : displayData.data.length} messages
            </small>
          </p>
        </header>

        {/* Error display */}
        {displayError && (
          <div box-="round" shear-="both" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ color: 'var(--red)' }}>Error: {displayError}</p>
            <button
              type="button"
              onClick={refresh}
              className="wui-button"
              style={{ marginTop: '0.5rem' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Messages table */}
        <div box-="round" shear-="both">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading messages...</p>
            </div>
          ) : displayData.data.length > 0 ? (
            <MessagesTable
              messages={displayData.data}
              sort={
                {
                  field: 'createdAt' as const,
                  direction: displayData.meta.sortDirection,
                } as MessageSort
              }
              onSortChange={(sort: MessageSort) => {
                // For now, only support createdAt sorting with cursor pagination
                if (sort.field === 'createdAt') {
                  handleSortChange('createdAt', sort.direction);
                }
              }}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>No messages found</p>
            </div>
          )}
        </div>

        {/* Cursor-based pagination controls */}
        <footer box-="round" shear-="top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label htmlFor="page-size">
                Items per page:
                <select
                  id="page-size"
                  value={displayData.meta.limit}
                  onChange={e => handlePageSizeChange(Number(e.target.value))}
                  className="wui-input"
                  style={{ marginLeft: '0.5rem' }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={resetPagination}
                className="wui-button"
                disabled={!hasPrev}
              >
                ⟲ First
              </button>
              <button type="button" onClick={prevPage} className="wui-button" disabled={!hasPrev}>
                ← Previous
              </button>
              <button type="button" onClick={nextPage} className="wui-button" disabled={!hasNext}>
                Next →
              </button>
            </div>

            <div>
              <small>{displayData.meta.hasMore ? 'More pages available' : 'Last page'}</small>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
