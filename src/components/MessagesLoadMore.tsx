import React, { useState, useCallback, useEffect } from 'react';
import type { MessagesCursorPaginationParams } from '../lib/types/cursor';
import type { MessagesFilterParams, MessageDisplay, MessageSort } from '../lib/types/messages';
import { MessagesTable } from './MessagesTable';
import { SearchAndFilters } from './SearchAndFilters';
import { MessagesClient, type SimplifiedCursorResponse } from '../lib/api/messages';

interface MessagesLoadMoreProps {
  initialMessages: SimplifiedCursorResponse;
  initialFilters: MessagesFilterParams;
  initialSort: MessageSort;
}

/**
 * Messages app with "Load More" pattern instead of traditional pagination.
 * Accumulates messages as the user loads more pages.
 */
export function MessagesLoadMore({
  initialMessages,
  initialFilters,
  initialSort,
}: MessagesLoadMoreProps) {
  const [messages, setMessages] = useState<MessageDisplay[]>(initialMessages.items);
  const [filters, setFilters] = useState<MessagesFilterParams>(initialFilters);
  const [sort, setSort] = useState<MessageSort>(initialSort);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialMessages.nextCursor);
  const [hasMore, setHasMore] = useState(initialMessages.hasMore);

  const client = new MessagesClient();

  /**
   * Loads the next page of messages and appends them to the existing list.
   */
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;

    setLoading(true);
    setError(null);

    try {
      const params: MessagesCursorPaginationParams = {
        cursor: nextCursor,
        limit: 20,
        sortBy: sort.field === 'createdAt' ? 'createdAt' : 'id',
        sortDirection: sort.direction,
      };

      const result = await client.getMessagesWithCursor(params, filters);

      setMessages(prev => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, sort, filters, client]);

  /**
   * Reloads messages from the beginning when filters or sort changes.
   */
  const reloadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: MessagesCursorPaginationParams = {
        limit: 20,
        sortBy: sort.field === 'createdAt' ? 'createdAt' : 'id',
        sortDirection: sort.direction,
      };

      const result = await client.getMessagesWithCursor(params, filters);

      setMessages(result.items);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error reloading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [sort, filters, client]);

  /**
   * Handles filter changes by reloading messages from the beginning.
   */
  const handleFiltersChange = useCallback((newFilters: MessagesFilterParams) => {
    setFilters(newFilters);
  }, []);

  /**
   * Handles sort changes by reloading messages from the beginning.
   */
  const handleSortChange = useCallback((sort: MessageSort) => {
    setSort(sort);
  }, []);

  // Reload messages when filters or sort changes
  useEffect(() => {
    reloadMessages();
  }, [filters, sort]);

  return (
    <div>
      <SearchAndFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {error && (
        <div box-="square" variant-="red" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <MessagesTable messages={messages} sort={sort} onSortChange={handleSortChange} />

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button className="wui-button" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.7 }}>
          <small>No more messages to load</small>
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div box-="square" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No messages found</p>
        </div>
      )}
    </div>
  );
}
