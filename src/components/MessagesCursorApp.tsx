/**
 * MessagesApp component using cursor-based pagination.
 * This component provides the complete messages interface with efficient
 * cursor-based pagination for handling large datasets.
 */

import React, { useState, useCallback } from 'react';
import { MessagesTable } from './MessagesTable.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { SearchAndFilters } from './SearchAndFilters.js';
import { MessagesClient } from '../lib/api/messages.js';
import type {
  MessagesCursorPaginationParams,
  MessagesCursorPaginationResponse,
} from '../lib/types/cursor.js';
import type { MessagesFilterParams, MessageDisplay, MessageSort } from '../lib/types/messages.js';

/**
 * Props for the MessagesCursorApp component.
 */
export interface MessagesCursorAppProps {
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
export function MessagesCursorApp({
  initialMessages,
  initialError,
  defaultPagination,
  defaultFilters,
}: MessagesCursorAppProps): React.ReactElement {
  const [data, setData] =
    useState<MessagesCursorPaginationResponse<MessageDisplay>>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [params, setParams] = useState<MessagesCursorPaginationParams>(defaultPagination);
  const [filters, setFilters] = useState<MessagesFilterParams>(defaultFilters);

  const client = new MessagesClient();

  /**
   * Fetch messages with given parameters.
   */
  const fetchMessages = useCallback(
    async (newParams: MessagesCursorPaginationParams, newFilters: MessagesFilterParams) => {
      setLoading(true);
      setError(null);

      try {
        const result = await client.getMessagesWithCursor(newParams, newFilters);
        setData(result);
        setParams(newParams);
        setFilters(newFilters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Navigate to next page.
   */
  const nextPage = useCallback(() => {
    if (data.cursors.next) {
      fetchMessages({ ...params, cursor: data.cursors.next }, filters);
    }
  }, [data.cursors.next, params, filters, fetchMessages]);

  /**
   * Navigate to previous page.
   */
  const prevPage = useCallback(() => {
    if (data.cursors.prev) {
      fetchMessages({ ...params, cursor: data.cursors.prev }, filters);
    }
  }, [data.cursors.prev, params, filters, fetchMessages]);

  /**
   * Reset to first page.
   */
  const resetPagination = useCallback(() => {
    fetchMessages({ ...params, cursor: undefined }, filters);
  }, [params, filters, fetchMessages]);

  /**
   * Handle page size change.
   */
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      fetchMessages({ ...params, limit: newPageSize, cursor: undefined }, filters);
    },
    [params, filters, fetchMessages]
  );

  /**
   * Handle sort change.
   */
  const handleSortChange = useCallback(
    (sort: MessageSort) => {
      // For now, only support createdAt sorting with cursor pagination
      if (sort.field === 'createdAt') {
        fetchMessages(
          { ...params, sortBy: 'createdAt', sortDirection: sort.direction, cursor: undefined },
          filters
        );
      }
    },
    [params, filters, fetchMessages]
  );

  /**
   * Handle filter change.
   */
  const handleFilterChange = useCallback(
    (newFilters: MessagesFilterParams) => {
      fetchMessages({ ...params, cursor: undefined }, newFilters);
    },
    [params, fetchMessages]
  );

  /**
   * Refresh current page.
   */
  const refresh = useCallback(() => {
    fetchMessages(params, filters);
  }, [params, filters, fetchMessages]);

  // Calculate stats from current data
  const stats = {
    totalMessages: data.meta.hasMore ? '?' : data.data.length.toString(),
    currentCount: data.data.length,
    hasMore: data.meta.hasMore,
  };

  return (
    <ErrorBoundary context="MessagesApp">
      <div>
        {/* Header with title and stats */}
        <header box-="round" shear-="bottom">
          <h1>AI Interaction Messages</h1>
          <p>
            <small>
              Cursor-based pagination • Showing {stats.currentCount} messages
              {stats.hasMore && ' • More available'}
            </small>
          </p>
        </header>

        {/* Search and filters */}
        <div box-="round" shear-="both">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            disabled={loading}
          />
        </div>

        {/* Error display */}
        {error && (
          <div box-="round" shear-="both" style={{ marginBottom: '1rem' }}>
            <p style={{ color: 'var(--red)', padding: '1rem' }}>
              <strong>Error:</strong> {error}
            </p>
            <div style={{ padding: '0 1rem 1rem' }}>
              <button type="button" onClick={refresh} className="wui-button">
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Messages table */}
        <div box-="round" shear-="both">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading messages...</p>
            </div>
          ) : data.data.length > 0 ? (
            <MessagesTable
              messages={data.data}
              sort={{
                field: 'createdAt',
                direction: params.sortDirection || 'desc',
              }}
              onSortChange={handleSortChange}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>No messages found</p>
              {filters && Object.keys(filters).length > 0 && (
                <p>
                  <small>Try adjusting your filters</small>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cursor-based pagination controls */}
        <footer box-="round" shear-="top">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
            }}
          >
            <div>
              <label htmlFor="page-size">
                Items per page:
                <select
                  id="page-size"
                  value={params.limit || 20}
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
                disabled={!params.cursor || loading}
              >
                ⟲ First
              </button>
              <button
                type="button"
                onClick={prevPage}
                className="wui-button"
                disabled={!data.cursors.prev || loading}
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={nextPage}
                className="wui-button"
                disabled={!data.cursors.next || loading}
              >
                Next →
              </button>
            </div>

            <div>
              <small>
                {data.meta.hasMore ? 'More pages available' : 'Last page'}
                {loading && ' • Loading...'}
              </small>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
