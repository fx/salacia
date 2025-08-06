import type { 
  MessagesCursorPaginationParams,
  MessagesCursorPaginatedResult 
} from '../types/messages.js';
import type { MessageSort } from '../types/cursor.js';

/**
 * API client for messages endpoints.
 */
export class MessagesClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get messages using cursor-based pagination.
   */
  async getMessagesCursor(params: MessagesCursorPaginationParams): Promise<MessagesCursorPaginatedResult> {
    const url = new URL(`${this.baseUrl}/api/v1/messages/cursor`);
    
    // Add query parameters
    url.searchParams.set('limit', params.limit.toString());
    if (params.cursor) {
      url.searchParams.set('cursor', params.cursor);
    }
    url.searchParams.set('sortField', params.sort.field);
    url.searchParams.set('sortDirection', params.sort.direction);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get messages with default cursor pagination settings.
   */
  async getMessagesDefault(limit = 20): Promise<MessagesCursorPaginatedResult> {
    return this.getMessagesCursor({
      limit,
      sort: { field: 'createdAt', direction: 'desc' },
    });
  }
}