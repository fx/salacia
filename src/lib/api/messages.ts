import type { MessagesCursorPaginationParams } from '../types/cursor.js';
import type { MessageDisplay, MessagesFilterParams } from '../types/messages.js';

/**
 * Simplified cursor response structure for frontend consumption.
 */
export interface SimplifiedCursorResponse {
  items: MessageDisplay[];
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

/**
 * Client for interacting with the messages API endpoints.
 * Provides methods for fetching messages with cursor-based pagination.
 */
export class MessagesClient {
  private baseUrl = '/api/messages';

  /**
   * Fetches messages using cursor-based pagination.
   *
   * @param params - Cursor pagination parameters
   * @param filters - Optional filtering criteria
   * @returns Promise resolving to simplified cursor-paginated response
   * @throws Error if the API request fails
   */
  async getMessagesWithCursor(
    params: MessagesCursorPaginationParams = {},
    filters: MessagesFilterParams = {}
  ): Promise<SimplifiedCursorResponse> {
    const queryParams = new URLSearchParams();

    // Add pagination parameters
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.cursor) queryParams.set('cursor', params.cursor);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.set('sortDirection', params.sortDirection);

    // Add filter parameters
    if (filters.model) queryParams.set('model', filters.model);
    if (filters.startDate) queryParams.set('startDate', filters.startDate.toISOString());
    if (filters.endDate) queryParams.set('endDate', filters.endDate.toISOString());
    if (filters.hasError !== undefined) queryParams.set('hasError', filters.hasError.toString());
    if (filters.minTokens !== undefined) queryParams.set('minTokens', filters.minTokens.toString());
    if (filters.maxTokens !== undefined) queryParams.set('maxTokens', filters.maxTokens.toString());
    if (filters.searchTerm) queryParams.set('searchTerm', filters.searchTerm);

    const response = await fetch(`${this.baseUrl}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Parse dates in the response
    return {
      ...data,
      items: data.items.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      })),
    };
  }
}
