import type { 
  MessagesPaginationParams, 
  MessagesSortParams, 
  MessagesFilterParams,
  MessagesQueryParams 
} from '../services/messages';

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION: MessagesPaginationParams = {
  page: 1,
  limit: 50,
};

/**
 * Default sorting settings
 */
export const DEFAULT_SORT: MessagesSortParams = {
  field: 'createdAt',
  direction: 'desc',
};

/**
 * Available sort fields with display labels
 */
export const SORT_FIELDS = {
  createdAt: 'Date Created',
  model: 'Model',
  totalTokens: 'Total Tokens',
  responseTimeMs: 'Response Time',
} as const;

/**
 * Available sort directions with display labels
 */
export const SORT_DIRECTIONS = {
  asc: 'Ascending',
  desc: 'Descending',
} as const;

/**
 * Parse pagination parameters from URL search params
 *
 * @param searchParams - URL search parameters
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(searchParams: URLSearchParams): MessagesPaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  return { page, limit };
}

/**
 * Parse sorting parameters from URL search params
 *
 * @param searchParams - URL search parameters
 * @returns Validated sorting parameters
 */
export function parseSortParams(searchParams: URLSearchParams): MessagesSortParams {
  const field = searchParams.get('sort') as MessagesSortParams['field'] || 'createdAt';
  const direction = searchParams.get('order') as MessagesSortParams['direction'] || 'desc';

  // Validate field
  const validField = Object.keys(SORT_FIELDS).includes(field) 
    ? field as MessagesSortParams['field']
    : 'createdAt';

  // Validate direction
  const validDirection = ['asc', 'desc'].includes(direction) 
    ? direction as MessagesSortParams['direction']
    : 'desc';

  return { field: validField, direction: validDirection };
}

/**
 * Parse filter parameters from URL search params
 *
 * @param searchParams - URL search parameters
 * @returns Filter parameters object
 */
export function parseFilterParams(searchParams: URLSearchParams): MessagesFilterParams | undefined {
  const filters: MessagesFilterParams = {};
  let hasFilters = false;

  // Model filter
  const model = searchParams.get('model');
  if (model && model.trim()) {
    filters.model = model.trim();
    hasFilters = true;
  }

  // Date range filters
  const dateFrom = searchParams.get('dateFrom');
  if (dateFrom) {
    const date = new Date(dateFrom);
    if (!isNaN(date.getTime())) {
      filters.dateFrom = date;
      hasFilters = true;
    }
  }

  const dateTo = searchParams.get('dateTo');
  if (dateTo) {
    const date = new Date(dateTo);
    if (!isNaN(date.getTime())) {
      filters.dateTo = date;
      hasFilters = true;
    }
  }

  // Provider ID filter
  const providerId = searchParams.get('providerId');
  if (providerId && providerId.trim()) {
    filters.providerId = providerId.trim();
    hasFilters = true;
  }

  // Status code filter
  const statusCode = searchParams.get('statusCode');
  if (statusCode) {
    const code = parseInt(statusCode, 10);
    if (!isNaN(code)) {
      filters.statusCode = code;
      hasFilters = true;
    }
  }

  // Error filter
  const hasError = searchParams.get('hasError');
  if (hasError === 'true') {
    filters.hasError = true;
    hasFilters = true;
  } else if (hasError === 'false') {
    filters.hasError = false;
    hasFilters = true;
  }

  return hasFilters ? filters : undefined;
}

/**
 * Parse complete query parameters from URL search params
 *
 * @param searchParams - URL search parameters
 * @returns Complete messages query parameters
 */
export function parseMessagesQueryParams(searchParams: URLSearchParams): MessagesQueryParams {
  return {
    pagination: parsePaginationParams(searchParams),
    sort: parseSortParams(searchParams),
    filters: parseFilterParams(searchParams),
  };
}

/**
 * Build URL search params from messages query parameters
 *
 * @param params - Messages query parameters
 * @returns URL search parameters string
 */
export function buildSearchParams(params: MessagesQueryParams): string {
  const searchParams = new URLSearchParams();

  // Pagination
  if (params.pagination.page !== DEFAULT_PAGINATION.page) {
    searchParams.set('page', params.pagination.page.toString());
  }
  if (params.pagination.limit !== DEFAULT_PAGINATION.limit) {
    searchParams.set('limit', params.pagination.limit.toString());
  }

  // Sorting
  if (params.sort.field !== DEFAULT_SORT.field) {
    searchParams.set('sort', params.sort.field);
  }
  if (params.sort.direction !== DEFAULT_SORT.direction) {
    searchParams.set('order', params.sort.direction);
  }

  // Filters
  if (params.filters) {
    if (params.filters.model) {
      searchParams.set('model', params.filters.model);
    }
    if (params.filters.dateFrom) {
      searchParams.set('dateFrom', params.filters.dateFrom.toISOString().split('T')[0]);
    }
    if (params.filters.dateTo) {
      searchParams.set('dateTo', params.filters.dateTo.toISOString().split('T')[0]);
    }
    if (params.filters.providerId) {
      searchParams.set('providerId', params.filters.providerId);
    }
    if (params.filters.statusCode !== undefined) {
      searchParams.set('statusCode', params.filters.statusCode.toString());
    }
    if (params.filters.hasError !== undefined) {
      searchParams.set('hasError', params.filters.hasError.toString());
    }
  }

  return searchParams.toString();
}

/**
 * Calculate pagination info for display
 *
 * @param page - Current page number
 * @param totalPages - Total number of pages
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination display info
 */
export function calculatePaginationInfo(
  page: number,
  totalPages: number,
  limit: number,
  total: number
) {
  const start = Math.min(total, (page - 1) * limit + 1);
  const end = Math.min(total, page * limit);
  
  return {
    start,
    end,
    total,
    showing: `${start}-${end} of ${total}`,
    pages: Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
      const pageNum = Math.max(1, Math.min(totalPages, page - 5 + i + 1));
      return {
        number: pageNum,
        isCurrent: pageNum === page,
      };
    }).filter((p, i, arr) => arr.findIndex(item => item.number === p.number) === i)
      .sort((a, b) => a.number - b.number),
  };
}