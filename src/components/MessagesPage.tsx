import React from 'react';
import { MessagesLoadMore } from './MessagesLoadMore.js';
import type { MessagesFilterParams, MessageSort } from '../lib/types/messages.js';
import type { SimplifiedCursorResponse } from '../lib/api/messages.js';

/**
 * React wrapper for the Messages page that ensures all interactive content
 * (Navigation + page body) is in a single React tree under RealtimeProvider.
 */
export interface MessagesPageProps {
  initialMessages: SimplifiedCursorResponse;
  initialFilters: MessagesFilterParams;
  initialSort: MessageSort;
}

export function MessagesPage({ initialMessages, initialFilters, initialSort }: MessagesPageProps) {
  return (
    <div>
      <div>
        <MessagesLoadMore
          initialMessages={initialMessages}
          initialFilters={initialFilters}
          initialSort={initialSort}
        />
      </div>
    </div>
  );
}

export default MessagesPage;
