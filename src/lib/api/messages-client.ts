import type { 
  MessagesCursorPaginationParams,
  MessagesCursorPaginatedResult 
} from '../types/messages.js';

export class MessagesClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async getMessagesCursor(params: MessagesCursorPaginationParams): Promise<MessagesCursorPaginatedResult> {
    const url = new URL(`${this.baseUrl}/api/v1/messages/cursor`);
    url.searchParams.set('limit', params.limit.toString());
    if (params.cursor) url.searchParams.set('cursor', params.cursor);
    url.searchParams.set('sortField', params.sort.field);
    url.searchParams.set('sortDirection', params.sort.direction);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }
}