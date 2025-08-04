import type {
  MessagesPaginationParams,
  MessagesFilterParams,
  MessageSortField,
  MessageSortDirection,
} from '../types/messages.js';

// TODO: Move these constants to MESSAGES_CONSTANTS when PR #28 is merged
const PAGINATION_CONSTANTS = {
  MAX_PAGE_SIZE: 100,
  MAX_PAGINATION_PAGES: 7,
  SORT_FIELDS: ['createdAt', 'model', 'totalTokens', 'responseTime'] as const,
} as const;

/**
 * URL parameter names for message filtering and pagination.
 * Provides consistent parameter naming across the application.
 */
export const URL_PARAMS = {
  // Pagination parameters
  PAGE: 'page',
  PAGE_SIZE: 'pageSize',

  // Sorting parameters
  SORT_FIELD: 'sortField',
  SORT_DIRECTION: 'sortDirection',

  // Filter parameters
  MODEL: 'model',
  PROVIDER: 'provider',
  START_DATE: 'startDate',
  END_DATE: 'endDate',
  HAS_ERROR: 'hasError',
  MIN_TOKENS: 'minTokens',
  MAX_TOKENS: 'maxTokens',
  MIN_RESPONSE_TIME: 'minResponseTime',
  MAX_RESPONSE_TIME: 'maxResponseTime',
  SEARCH_TERM: 'searchTerm',
} as const;

/**
 * Default values for pagination and filtering parameters.
 * Ensures consistent behavior when parameters are not specified.
 */
export const DEFAULT_VALUES = {
  PAGE: 1,
  PAGE_SIZE: 20,
  SORT_FIELD: 'createdAt' as MessageSortField,
  SORT_DIRECTION: 'desc' as MessageSortDirection,
} as const;

/**
 * Parses URL search parameters into structured pagination parameters.
 * Validates input values and provides sensible defaults for missing parameters.
 *
 * @param searchParams - URLSearchParams object from the current URL
 * @returns Validated pagination parameters with defaults applied
 */
export function parseUrlPaginationParams(searchParams: URLSearchParams): MessagesPaginationParams {
  // Parse and validate page number
  const pageParam = searchParams.get(URL_PARAMS.PAGE);
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : DEFAULT_VALUES.PAGE;

  // Parse and validate page size
  const pageSizeParam = searchParams.get(URL_PARAMS.PAGE_SIZE);
  let pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : DEFAULT_VALUES.PAGE_SIZE;
  pageSize = Math.max(1, Math.min(PAGINATION_CONSTANTS.MAX_PAGE_SIZE, pageSize)); // Clamp between 1 and max

  // Parse and validate sort configuration
  const sortField = parseSortField(searchParams.get(URL_PARAMS.SORT_FIELD));
  const sortDirection = parseSortDirection(searchParams.get(URL_PARAMS.SORT_DIRECTION));

  return {
    page: isNaN(page) ? DEFAULT_VALUES.PAGE : page,
    pageSize: isNaN(pageSize) ? DEFAULT_VALUES.PAGE_SIZE : pageSize,
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };
}

/**
 * Parses URL search parameters into structured filter parameters.
 * Handles type conversion and validation for all supported filter types.
 *
 * @param searchParams - URLSearchParams object from the current URL
 * @returns Parsed filter parameters with proper type conversion
 */
export function parseUrlFilterParams(searchParams: URLSearchParams): MessagesFilterParams {
  const filters: MessagesFilterParams = {};

  // String filters
  const model = searchParams.get(URL_PARAMS.MODEL);
  if (model) filters.model = model;

  const provider = searchParams.get(URL_PARAMS.PROVIDER);
  if (provider) filters.provider = provider;

  const searchTerm = searchParams.get(URL_PARAMS.SEARCH_TERM);
  if (searchTerm) filters.searchTerm = searchTerm;

  // Date filters
  const startDateParam = searchParams.get(URL_PARAMS.START_DATE);
  if (startDateParam) {
    const startDate = new Date(startDateParam);
    if (!isNaN(startDate.getTime())) {
      filters.startDate = startDate;
    }
  }

  const endDateParam = searchParams.get(URL_PARAMS.END_DATE);
  if (endDateParam) {
    const endDate = new Date(endDateParam);
    if (!isNaN(endDate.getTime())) {
      filters.endDate = endDate;
    }
  }

  // Boolean filters
  const hasErrorParam = searchParams.get(URL_PARAMS.HAS_ERROR);
  if (hasErrorParam !== null) {
    filters.hasError = hasErrorParam === 'true';
  }

  // Numeric filters with validation
  const minTokensParam = searchParams.get(URL_PARAMS.MIN_TOKENS);
  if (minTokensParam) {
    const minTokens = parseInt(minTokensParam, 10);
    if (!isNaN(minTokens) && minTokens >= 0) {
      filters.minTokens = minTokens;
    }
  }

  const maxTokensParam = searchParams.get(URL_PARAMS.MAX_TOKENS);
  if (maxTokensParam) {
    const maxTokens = parseInt(maxTokensParam, 10);
    if (!isNaN(maxTokens) && maxTokens >= 0) {
      filters.maxTokens = maxTokens;
    }
  }

  const minResponseTimeParam = searchParams.get(URL_PARAMS.MIN_RESPONSE_TIME);
  if (minResponseTimeParam) {
    const minResponseTime = parseInt(minResponseTimeParam, 10);
    if (!isNaN(minResponseTime) && minResponseTime >= 0) {
      filters.minResponseTime = minResponseTime;
    }
  }

  const maxResponseTimeParam = searchParams.get(URL_PARAMS.MAX_RESPONSE_TIME);
  if (maxResponseTimeParam) {
    const maxResponseTime = parseInt(maxResponseTimeParam, 10);
    if (!isNaN(maxResponseTime) && maxResponseTime >= 0) {
      filters.maxResponseTime = maxResponseTime;
    }
  }

  return filters;
}

/**
 * Serializes pagination and filter parameters into URL search parameters.
 * Omits default values to keep URLs clean and bookmarkable.
 *
 * @param pagination - Pagination parameters to serialize
 * @param filters - Filter parameters to serialize
 * @returns URLSearchParams object ready for URL construction
 */
export function serializeToUrlParams(
  pagination: MessagesPaginationParams,
  filters: MessagesFilterParams = {}
): URLSearchParams {
  const params = new URLSearchParams();

  // Pagination parameters (only set if different from defaults)
  if (pagination.page !== DEFAULT_VALUES.PAGE) {
    params.set(URL_PARAMS.PAGE, pagination.page.toString());
  }
  if (pagination.pageSize !== DEFAULT_VALUES.PAGE_SIZE) {
    params.set(URL_PARAMS.PAGE_SIZE, pagination.pageSize.toString());
  }

  // Sort parameters (only set if different from defaults)
  if (pagination.sort.field !== DEFAULT_VALUES.SORT_FIELD) {
    params.set(URL_PARAMS.SORT_FIELD, pagination.sort.field);
  }
  if (pagination.sort.direction !== DEFAULT_VALUES.SORT_DIRECTION) {
    params.set(URL_PARAMS.SORT_DIRECTION, pagination.sort.direction);
  }

  // Filter parameters (only set if present)
  if (filters.model) params.set(URL_PARAMS.MODEL, filters.model);
  if (filters.provider) params.set(URL_PARAMS.PROVIDER, filters.provider);
  if (filters.searchTerm) params.set(URL_PARAMS.SEARCH_TERM, filters.searchTerm);

  if (filters.startDate) {
    params.set(URL_PARAMS.START_DATE, serializeDate(filters.startDate));
  }
  if (filters.endDate) {
    params.set(URL_PARAMS.END_DATE, serializeDate(filters.endDate));
  }

  if (filters.hasError !== undefined) {
    params.set(URL_PARAMS.HAS_ERROR, filters.hasError.toString());
  }

  if (filters.minTokens !== undefined) {
    params.set(URL_PARAMS.MIN_TOKENS, filters.minTokens.toString());
  }
  if (filters.maxTokens !== undefined) {
    params.set(URL_PARAMS.MAX_TOKENS, filters.maxTokens.toString());
  }
  if (filters.minResponseTime !== undefined) {
    params.set(URL_PARAMS.MIN_RESPONSE_TIME, filters.minResponseTime.toString());
  }
  if (filters.maxResponseTime !== undefined) {
    params.set(URL_PARAMS.MAX_RESPONSE_TIME, filters.maxResponseTime.toString());
  }

  return params;
}

/**
 * Calculates pagination metadata for building navigation UI components.
 * Handles edge cases and provides all necessary data for pagination controls.
 *
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of available pages
 * @param maxPages - Maximum number of page links to show in navigation
 * @returns Pagination metadata for UI rendering
 */
export function calculatePaginationMetadata(
  currentPage: number,
  totalPages: number,
  maxPages: number = PAGINATION_CONSTANTS.MAX_PAGINATION_PAGES
) {
  // Handle edge cases
  if (totalPages <= 0) {
    return {
      startPage: 1,
      endPage: 1,
      hasPrevious: false,
      hasNext: false,
      showFirstPage: false,
      showLastPage: false,
      showPreviousEllipsis: false,
      showNextEllipsis: false,
      pages: [1],
    };
  }

  // Clamp current page to valid range
  const safePage = Math.max(1, Math.min(currentPage, totalPages));

  // If total pages fit within max pages, show all
  if (totalPages <= maxPages) {
    return {
      startPage: 1,
      endPage: totalPages,
      hasPrevious: safePage > 1,
      hasNext: safePage < totalPages,
      showFirstPage: false,
      showLastPage: false,
      showPreviousEllipsis: false,
      showNextEllipsis: false,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
    };
  }

  // Calculate the range of pages to show
  const halfMax = Math.floor(maxPages / 2);
  let startPage = Math.max(1, safePage - halfMax);
  const endPage = Math.min(totalPages, startPage + maxPages - 1);

  // Adjust if we're near the end
  if (endPage === totalPages) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  // Determine what navigation elements to show
  const showFirstPage = startPage > 1;
  const showLastPage = endPage < totalPages;
  const showPreviousEllipsis = startPage > 2;
  const showNextEllipsis = endPage < totalPages - 1;

  // Generate array of page numbers to display
  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return {
    startPage,
    endPage,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
    showFirstPage,
    showLastPage,
    showPreviousEllipsis,
    showNextEllipsis,
    pages,
  };
}

/**
 * Parses and validates a sort field parameter.
 *
 * @param value - Raw sort field value from URL parameter
 * @returns Valid sort field or default
 * @private
 */
function parseSortField(value: string | null): MessageSortField {
  if (!value) return DEFAULT_VALUES.SORT_FIELD;

  const validFields = PAGINATION_CONSTANTS.SORT_FIELDS;
  return validFields.includes(value as MessageSortField)
    ? (value as MessageSortField)
    : DEFAULT_VALUES.SORT_FIELD;
}

/**
 * Serializes a Date object to ISO date string (YYYY-MM-DD format).
 *
 * @param date - Date object to serialize
 * @returns ISO date string in YYYY-MM-DD format
 * @private
 */
function serializeDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses and validates a sort direction parameter.
 *
 * @param value - Raw sort direction value from URL parameter
 * @returns Valid sort direction or default
 * @private
 */
function parseSortDirection(value: string | null): MessageSortDirection {
  if (!value) return DEFAULT_VALUES.SORT_DIRECTION;

  return value === 'asc' || value === 'desc' ? value : DEFAULT_VALUES.SORT_DIRECTION;
}
