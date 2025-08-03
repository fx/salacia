import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import type { AnthropicResponse } from '../../lib/ai/types';

/**
 * Test utilities for making HTTP requests and handling responses
 * in the Salacia test suite.
 */

/**
 * Default headers for API requests in tests
 */
export const DEFAULT_TEST_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': 'test-api-key',
  'anthropic-version': '2023-06-01',
} as const;

/**
 * Creates a mock fetch function for testing API requests
 *
 * @param mockResponse - The response to return from the mock fetch
 * @param status - HTTP status code to return (default: 200)
 * @returns Mock fetch function
 *
 * @example
 * ```typescript
 * const mockFetch = createMockFetch({ id: '123', content: 'Hello' });
 * global.fetch = mockFetch;
 * ```
 */
export function createMockFetch(
  mockResponse: unknown,
  status: number = 200
): MockedFunction<typeof fetch> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({
      'content-type': 'application/json',
    }),
    json: async () => mockResponse,
    text: async () => JSON.stringify(mockResponse),
    blob: async () => new Blob([JSON.stringify(mockResponse)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: function () {
      return this;
    },
  } as Response);
}

/**
 * Creates headers for Anthropic API requests with optional overrides
 *
 * @param overrides - Additional or override headers
 * @returns Headers object for requests
 *
 * @example
 * ```typescript
 * const headers = createTestHeaders({ 'x-api-key': 'custom-key' });
 * ```
 */
export function createTestHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    ...DEFAULT_TEST_HEADERS,
    ...overrides,
  };
}

/**
 * Converts a headers object to Headers instance
 *
 * @param headers - Plain object with header key-value pairs
 * @returns Headers instance
 */
export function createHeadersInstance(headers: Record<string, string>): Headers {
  const headersInstance = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    headersInstance.set(key, value);
  });
  return headersInstance;
}

/**
 * Creates a mock Request object for testing
 *
 * @param body - Request body (will be JSON stringified if object)
 * @param options - Request options including headers, method, etc.
 * @returns Mock Request object
 *
 * @example
 * ```typescript
 * const request = createMockRequest({ messages: [] }, { method: 'POST' });
 * ```
 */
export function createMockRequest(
  body: unknown,
  options: {
    method?: string;
    headers?: Record<string, string>;
    url?: string;
  } = {}
): Request {
  const { method = 'POST', headers = {}, url = 'http://localhost:3000/api/v1/messages' } = options;

  const requestHeaders = createTestHeaders(headers);
  const requestBody = typeof body === 'string' ? body : JSON.stringify(body);

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });
}

/**
 * Extracts and parses JSON from a Response object
 *
 * @param response - Response object to parse
 * @returns Parsed JSON data
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  return JSON.parse(text) as T;
}

/**
 * Type definition for assertion helper methods
 */
type AssertionHelpers = {
  hasStatus(_response: Response, _expectedStatus: number): void;
  hasContentType(_response: Response, _expectedContentType: string): void;
  isValidAnthropicResponse(response: unknown): asserts response is AnthropicResponse;
};

/**
 * Assertion helpers for testing API responses
 */
export const assertions: AssertionHelpers = {
  /**
   * Asserts that a response has the expected status code
   *
   * @param response - Response to check
   * @param expectedStatus - Expected HTTP status code
   */
  hasStatus(response: Response, expectedStatus: number): void {
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
  },

  /**
   * Asserts that a response has the expected content type
   *
   * @param response - Response to check
   * @param expectedContentType - Expected content type
   */
  hasContentType(response: Response, expectedContentType: string): void {
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes(expectedContentType)) {
      throw new Error(
        `Expected content type to include ${expectedContentType}, got ${contentType}`
      );
    }
  },

  /**
   * Asserts that an Anthropic response has the required structure
   *
   * @param response - Response data to validate
   */
  isValidAnthropicResponse(response: unknown): asserts response is AnthropicResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Response is not an object');
    }

    const resp = response as Record<string, unknown>;

    if (!resp.id || typeof resp.id !== 'string') {
      throw new Error('Response missing or invalid id field');
    }

    if (resp.type !== 'message') {
      throw new Error('Response type must be "message"');
    }

    if (resp.role !== 'assistant') {
      throw new Error('Response role must be "assistant"');
    }

    if (!Array.isArray(resp.content)) {
      throw new Error('Response content must be an array');
    }
  },
};
