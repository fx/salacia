/**
 * MessagesClient - Client-side API wrapper for messages cursor pagination.
 * Provides type-safe API interactions with proper error handling.
 */

import type { CursorPaginationRequest, CursorPaginationResponse } from '../types/pagination.js';
import type { AiInteraction } from '../db/schema.js';

/**
 * Error types for API client operations.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_LIMIT';

/**
 * Structured API error response.
 */
export interface ApiError {
  error: string;
  code: ApiErrorCode;
}

/**
 * Client configuration options.
 */
export interface MessagesClientConfig {
  /** Base URL for API calls (defaults to current origin) */
  baseUrl?: string;
  /** Default timeout in milliseconds */
  timeout?: number;
}

/**
 * Type-safe client for interacting with the messages cursor API.
 */
export class MessagesClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: MessagesClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? '';
    this.timeout = config.timeout ?? 10000; // 10 second default
  }

  /**
   * Fetches messages using cursor-based pagination.
   * @param params Pagination parameters
   * @returns Promise resolving to paginated messages response
   * @throws ApiError on validation or server errors
   */
  async getMessages(
    params: CursorPaginationRequest = {}
  ): Promise<CursorPaginationResponse<AiInteraction>> {
    const url = this.buildUrl('/api/v1/messages/cursor', params);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw this.createApiError(data, response.status);
      }

      return data as CursorPaginationResponse<AiInteraction>;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.createApiError(
          {
            error: 'Network request failed',
            code: 'NETWORK_ERROR',
          },
          0
        );
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw this.createApiError(
          {
            error: 'Request timeout',
            code: 'NETWORK_ERROR',
          },
          0
        );
      }

      // Re-throw ApiError instances
      if (this.isApiError(error)) {
        throw error;
      }

      // Wrap unknown errors
      throw this.createApiError(
        {
          error: 'Unknown error occurred',
          code: 'INTERNAL_ERROR',
        },
        0
      );
    }
  }

  /**
   * Builds a URL with query parameters.
   * @param path API path
   * @param params Query parameters
   * @returns Complete URL string
   */
  private buildUrl(path: string, params: CursorPaginationRequest): string {
    const url = new URL(path, this.baseUrl || window.location.origin);

    if (params.limit !== undefined) {
      url.searchParams.set('limit', params.limit.toString());
    }

    if (params.cursor) {
      url.searchParams.set('cursor', params.cursor);
    }

    if (params.sortBy) {
      url.searchParams.set('sortBy', params.sortBy);
    }

    if (params.sortDirection) {
      url.searchParams.set('sortDirection', params.sortDirection);
    }

    return url.toString();
  }

  /**
   * Creates a structured API error.
   * @param errorData Error response data
   * @param status HTTP status code (unused but kept for future extension)
   * @returns ApiError instance
   */
  private createApiError(errorData: any, _status: number): ApiError {
    if (errorData && typeof errorData === 'object' && 'error' in errorData && 'code' in errorData) {
      return errorData as ApiError;
    }

    return {
      error: typeof errorData === 'string' ? errorData : 'Unknown error',
      code: 'INTERNAL_ERROR',
    };
  }

  /**
   * Type guard to check if an error is an ApiError.
   * @param error Error to check
   * @returns True if error is ApiError
   */
  private isApiError(error: any): error is ApiError {
    return error && typeof error === 'object' && 'error' in error && 'code' in error;
  }
}

/**
 * Default singleton instance for convenience.
 */
export const messagesClient = new MessagesClient();
