import type { MessageSort } from './cursor.js';

export interface MessageDisplay {
  id: string;
  model: string;
  createdAt: Date;
  isSuccess: boolean;
  requestPreview: string;
}

export interface MessagesCursorPaginatedResult {
  messages: MessageDisplay[];
  limit: number;
  nextCursor?: string;
  hasMore: boolean;
  sort: MessageSort;
}