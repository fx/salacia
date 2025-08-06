export type MessageSortField = 'createdAt' | 'model';
export type MessageSortDirection = 'asc' | 'desc';

export interface MessageSort {
  field: MessageSortField;
  direction: MessageSortDirection;
}

export interface MessagesCursorPaginationParams {
  limit: number;
  cursor?: string;
  sort: MessageSort;
}