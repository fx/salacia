/**
 * API client utilities for fetching messages from the messages API endpoint.
 *
 * This module provides a clean interface for making HTTP requests to the messages API,
 * handling URL parameter serialization, error handling, and response parsing.
 *
 * @module MessagesClient
 */

import type {
  MessagesPaginatedResult,
  MessagesPaginationParams,
  MessagesFilterParams,
  MessageDisplay,
} from '../types/messages.js';

/**
 * Raw message response from API before date parsing.
 * Used internally for type-safe parsing of API responses.
 */
interface MessageApiResponse extends Omit<MessageDisplay, 'createdAt'> {
  /** createdAt as string before parsing to Date */
  createdAt: string;
}

/**
 * Raw API response structure before date parsing.
 */
interface RawApiResponse extends Omit<MessagesPaginatedResult, 'messages'> {
  /** Messages with string dates that need parsing */
  messages?: MessageApiResponse[];
}

/**
 * Error class for messages API client errors.
 * Provides structured error information for API failures.
 */
export class MessagesApiError extends Error {
  /** HTTP status code from the API response */
  public readonly status: number;
  /** Error code from the API response */
  public readonly code: string;
  /** Additional error details */
  public readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'MessagesApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Configuration for the messages API client.
 */
export interface MessagesClientConfig {
  /** Base URL for the API (defaults to current origin) */
  baseUrl?: string;
  /** Request timeout in milliseconds (defaults to 30000) */
  timeout?: number;
}

/**
 * Default configuration for the messages API client.
 */
const DEFAULT_CONFIG: Required<MessagesClientConfig> = {
  baseUrl: '',
  timeout: 30000,
};

/**
 * Builds URL search parameters from pagination and filter parameters.
 * Handles proper serialization of dates, numbers, and boolean values.
 *
 * @param paginationParams - Pagination configuration
 * @param filterParams - Filter parameters (optional)
 * @returns URLSearchParams object ready for API request
 */
export function buildApiUrlParams(
  paginationParams: MessagesPaginationParams,
  filterParams?: MessagesFilterParams
): URLSearchParams {
  const params = new URLSearchParams();

  // Add pagination parameters
  params.set('page', paginationParams.page.toString());
  params.set('pageSize', paginationParams.pageSize.toString());
  params.set('sortField', paginationParams.sort.field);
  params.set('sortDirection', paginationParams.sort.direction);

  // Add filter parameters if provided
  if (filterParams) {
    if (filterParams.model) {
      params.set('model', filterParams.model);
    }
    if (filterParams.provider) {
      params.set('provider', filterParams.provider);
    }
    if (filterParams.startDate) {
      params.set('startDate', filterParams.startDate.toISOString().split('T')[0]);
    }
    if (filterParams.endDate) {
      params.set('endDate', filterParams.endDate.toISOString().split('T')[0]);
    }
    if (typeof filterParams.hasError === 'boolean') {
      params.set('hasError', filterParams.hasError.toString());
    }
    if (typeof filterParams.minTokens === 'number') {
      params.set('minTokens', filterParams.minTokens.toString());
    }
    if (typeof filterParams.maxTokens === 'number') {
      params.set('maxTokens', filterParams.maxTokens.toString());
    }
    if (typeof filterParams.minResponseTime === 'number') {
      params.set('minResponseTime', filterParams.minResponseTime.toString());
    }
    if (typeof filterParams.maxResponseTime === 'number') {
      params.set('maxResponseTime', filterParams.maxResponseTime.toString());
    }
    if (filterParams.searchTerm) {
      params.set('searchTerm', filterParams.searchTerm);
    }
  }

  return params;
}

/**
 * Parses dates in API response data, converting ISO strings back to Date objects.
 * Handles the MessagesPaginatedResult structure with nested MessageDisplay objects.
 *
 * @param data - Raw API response data
 * @returns Parsed data with Date objects restored
 */
export function parseApiResponseDates(data: unknown): MessagesPaginatedResult {
  // Parse the outer structure  
  const rawResult = data as RawApiResponse;
  
  // Parse dates in each message
  const messages: MessageDisplay[] = rawResult.messages 
    ? rawResult.messages.map(
        (message: MessageApiResponse): MessageDisplay => ({
          ...message,
          createdAt: new Date(message.createdAt),
        })
      )
    : [];

  const result: MessagesPaginatedResult = {
    ...rawResult,
    messages,
  };

  // Parse filter dates if present
  if (result.filters) {
    if (result.filters.startDate) {
      result.filters.startDate = new Date(result.filters.startDate);
    }
    if (result.filters.endDate) {
      result.filters.endDate = new Date(result.filters.endDate);
    }
  }

  return result;
}

/**
 * Messages API client class providing methods for fetching message data.
 * Handles HTTP requests, error handling, and response parsing.
 */
export class MessagesClient {
  private readonly config: Required<MessagesClientConfig>;

  /**
   * Creates a new MessagesClient instance.
   *
   * @param config - Client configuration options
   */
  constructor(config: MessagesClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetches paginated messages from the API.
   *
   * @param paginationParams - Pagination configuration
   * @param filterParams - Optional filter parameters
   * @returns Promise resolving to paginated message results
   * @throws MessagesApiError for API failures
   */
  async getMessages(
    paginationParams: MessagesPaginationParams,
    filterParams?: MessagesFilterParams
  ): Promise<MessagesPaginatedResult> {
    const urlParams = buildApiUrlParams(paginationParams, filterParams);
    const url = `${this.config.baseUrl}/api/messages?${urlParams.toString()}`;

    try {
      // Create AbortController for timeout handling
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: { error?: string; code?: string; details?: unknown } = {};
        try {
          errorData = (await response.json()) as {
            error?: string;
            code?: string;
            details?: unknown;
          };
        } catch {
          // Response body is not JSON, use default error structure
        }

        throw new MessagesApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code || 'HTTP_ERROR',
          errorData.details
        );
      }

      const data = await response.json();
      return parseApiResponseDates(data);
    } catch (error) {
      if (error instanceof MessagesApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new MessagesApiError('Request timeout', 0, 'TIMEOUT_ERROR');
        }

        throw new MessagesApiError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR', error);
      }

      throw new MessagesApiError('Unknown error occurred', 0, 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Fetches a single message by ID.
   *
   * @param id - Message ID to fetch
   * @returns Promise resolving to message display data
   * @throws MessagesApiError for API failures
   */
  async getMessage(id: string): Promise<MessageDisplay> {
    const url = `${this.config.baseUrl}/api/messages/${encodeURIComponent(id)}`;

    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: { error?: string; code?: string; details?: unknown } = {};
        try {
          errorData = (await response.json()) as {
            error?: string;
            code?: string;
            details?: unknown;
          };
        } catch {
          // Response body is not JSON, use default error structure
        }

        throw new MessagesApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code || 'HTTP_ERROR',
          errorData.details
        );
      }

      const data = await response.json();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
      };
    } catch (error) {
      if (error instanceof MessagesApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new MessagesApiError('Request timeout', 0, 'TIMEOUT_ERROR');
        }

        throw new MessagesApiError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR', error);
      }

      throw new MessagesApiError('Unknown error occurred', 0, 'UNKNOWN_ERROR', error);
    }
  }
}

/**
 * Default messages client instance with standard configuration.
 * Can be used directly for most use cases.
 */
export const messagesClient = new MessagesClient();

/**
 * Creates a new messages client with custom configuration.
 *
 * @param config - Client configuration options
 * @returns New MessagesClient instance
 */
export function createMessagesClient(config: MessagesClientConfig): MessagesClient {
  return new MessagesClient(config);
}
