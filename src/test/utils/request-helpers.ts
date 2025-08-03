import type { AnthropicRequest, AnthropicMessage } from '../../lib/ai/types';

/**
 * Configuration options for creating test requests
 */
export interface TestRequestOptions {
  /** Request method (default: 'POST') */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Base URL for the request (default: 'http://localhost:4321') */
  baseUrl?: string;
  /** Whether the request is for streaming (default: false) */
  streaming?: boolean;
}

/**
 * Default headers for API test requests
 */
export const DEFAULT_TEST_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Salacia-Test/1.0',
  'Accept': 'application/json',
} as const;

/**
 * Common test request configurations
 */
export const TEST_REQUEST_CONFIGS = {
  /** Standard JSON API request */
  standard: {
    method: 'POST',
    headers: DEFAULT_TEST_HEADERS,
  },
  /** Streaming request configuration */
  streaming: {
    method: 'POST',
    headers: {
      ...DEFAULT_TEST_HEADERS,
      'Accept': 'text/event-stream',
    },
  },
  /** OPTIONS preflight request */
  options: {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  },
} as const;

/**
 * Create a standardized test Request object for API testing
 * 
 * This utility creates Web API Request objects that can be used in tests
 * to simulate incoming HTTP requests to the API endpoints.
 * 
 * @param url - The request URL (absolute or relative to baseUrl)
 * @param options - Configuration options for the request
 * @returns A Request object ready for testing
 * 
 * @example
 * ```typescript
 * // Create a basic POST request
 * const request = createTestRequest('/api/v1/messages', {
 *   body: { model: 'claude-3', messages: [{ role: 'user', content: 'Hello' }] }
 * });
 * 
 * // Create a streaming request
 * const streamRequest = createTestRequest('/api/v1/messages', {
 *   body: { model: 'claude-3', messages: [{ role: 'user', content: 'Hello' }], stream: true },
 *   streaming: true
 * });
 * ```
 */
export function createTestRequest(url: string, options: TestRequestOptions = {}): Request {
  const {
    method = 'POST',
    headers = {},
    body,
    baseUrl = 'http://localhost:4321',
    streaming = false,
  } = options;

  // Construct full URL
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  // Merge headers with defaults, prioritizing streaming config if needed
  const defaultHeaders = streaming ? TEST_REQUEST_CONFIGS.streaming.headers : DEFAULT_TEST_HEADERS;
  const mergedHeaders = { ...defaultHeaders, ...headers };

  // Create request init object
  const requestInit: RequestInit = {
    method,
    headers: mergedHeaders,
  };

  // Add body if provided
  if (body !== undefined) {
    if (typeof body === 'string') {
      requestInit.body = body;
    } else {
      requestInit.body = JSON.stringify(body);
    }
  }

  return new Request(fullUrl, requestInit);
}

/**
 * Create a test Request specifically for the Anthropic API format
 * 
 * This is a specialized helper that creates requests matching the Anthropic
 * API specification, with proper validation and formatting.
 * 
 * @param requestData - Anthropic API request data
 * @param options - Additional request options
 * @returns A Request object with Anthropic-compatible formatting
 * 
 * @example
 * ```typescript
 * const request = createAnthropicTestRequest({
 *   model: 'claude-3-sonnet-20240229',
 *   messages: [{ role: 'user', content: 'Hello, world!' }],
 *   max_tokens: 1000
 * });
 * ```
 */
export function createAnthropicTestRequest(
  requestData: AnthropicRequest,
  options: Omit<TestRequestOptions, 'body'> = {}
): Request {
  return createTestRequest('/api/v1/messages', {
    ...options,
    body: requestData,
    streaming: requestData.stream === true,
  });
}

/**
 * Builder class for creating complex test messages
 * 
 * Provides a fluent interface for building Anthropic message objects
 * with proper typing and validation.
 * 
 * @example
 * ```typescript
 * const message = new MessageBuilder()
 *   .setRole('user')
 *   .setText('Hello, Claude!')
 *   .build();
 * 
 * const complexMessage = new MessageBuilder()
 *   .setRole('user')
 *   .addTextContent('Here is an image:')
 *   .addImageContent('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'image/png')
 *   .build();
 * ```
 */
export class MessageBuilder {
  private message: Partial<AnthropicMessage> = {};

  /**
   * Set the message role
   */
  setRole(role: AnthropicMessage['role']): this {
    this.message.role = role;
    return this;
  }

  /**
   * Set simple text content (overwrites any existing content)
   */
  setText(content: string): this {
    this.message.content = content;
    return this;
  }

  /**
   * Initialize multimodal content array (overwrites any existing content)
   */
  initMultimodalContent(): this {
    this.message.content = [];
    return this;
  }

  /**
   * Add text content block to multimodal content
   */
  addTextContent(text: string): this {
    if (!Array.isArray(this.message.content)) {
      this.initMultimodalContent();
    }
    (this.message.content as any[]).push({
      type: 'text',
      text,
    });
    return this;
  }

  /**
   * Add image content block to multimodal content
   */
  addImageContent(data: string, mediaType: string): this {
    if (!Array.isArray(this.message.content)) {
      this.initMultimodalContent();
    }
    (this.message.content as any[]).push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data,
      },
    });
    return this;
  }

  /**
   * Build and return the final message object
   */
  build(): AnthropicMessage {
    if (!this.message.role) {
      throw new Error('Message role is required');
    }
    if (!this.message.content) {
      throw new Error('Message content is required');
    }
    return this.message as AnthropicMessage;
  }

  /**
   * Reset the builder to start fresh
   */
  reset(): this {
    this.message = {};
    return this;
  }
}

/**
 * Pre-built test message templates for common scenarios
 */
export const TEST_MESSAGES = {
  /**
   * Simple user greeting message
   */
  simpleUser: (): AnthropicMessage => ({
    role: 'user',
    content: 'Hello, how are you today?',
  }),

  /**
   * Simple assistant response message
   */
  simpleAssistant: (): AnthropicMessage => ({
    role: 'assistant',
    content: 'I am doing well, thank you for asking! How can I help you today?',
  }),

  /**
   * System message with instructions
   */
  systemInstruction: (): AnthropicMessage => ({
    role: 'system',
    content: 'You are a helpful AI assistant. Please be concise and accurate in your responses.',
  }),

  /**
   * Long user message for testing token limits
   */
  longUser: (): AnthropicMessage => ({
    role: 'user',
    content: 'This is a very long message that is designed to test how the system handles messages with many tokens. '.repeat(50),
  }),

  /**
   * Empty content message (for testing validation)
   */
  emptyContent: (): AnthropicMessage => ({
    role: 'user',
    content: '',
  }),

  /**
   * Multimodal message with text and image
   */
  multimodal: (): AnthropicMessage => ({
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Please analyze this image:',
      },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      },
    ],
  }),
} as const;

/**
 * Pre-built test request templates for common API scenarios
 */
export const TEST_REQUESTS = {
  /**
   * Basic completion request
   */
  basicCompletion: (): AnthropicRequest => ({
    model: 'claude-3-sonnet-20240229',
    messages: [TEST_MESSAGES.simpleUser()],
    max_tokens: 1000,
  }),

  /**
   * Streaming completion request
   */
  streamingCompletion: (): AnthropicRequest => ({
    model: 'claude-3-sonnet-20240229',
    messages: [TEST_MESSAGES.simpleUser()],
    max_tokens: 1000,
    stream: true,
  }),

  /**
   * Request with system message and temperature
   */
  withSystemMessage: (): AnthropicRequest => ({
    model: 'claude-3-sonnet-20240229',
    messages: [TEST_MESSAGES.systemInstruction(), TEST_MESSAGES.simpleUser()],
    max_tokens: 500,
    temperature: 0.7,
    system: 'You are a helpful assistant.',
  }),

  /**
   * Request with conversation history
   */
  withHistory: (): AnthropicRequest => ({
    model: 'claude-3-sonnet-20240229',
    messages: [
      TEST_MESSAGES.simpleUser(),
      TEST_MESSAGES.simpleAssistant(),
      { role: 'user', content: 'Can you tell me more about TypeScript?' },
    ],
    max_tokens: 1000,
  }),

  /**
   * Multimodal request with image
   */
  multimodal: (): AnthropicRequest => ({
    model: 'claude-3-sonnet-20240229',
    messages: [TEST_MESSAGES.multimodal()],
    max_tokens: 1000,
  }),

  /**
   * Request with all optional parameters
   */
  fullParameters: (): AnthropicRequest => ({
    model: 'claude-3-sonnet-20240229',
    messages: [TEST_MESSAGES.simpleUser()],
    max_tokens: 2000,
    temperature: 0.8,
    top_p: 0.9,
    top_k: 50,
    stream: false,
    system: 'You are a creative writing assistant.',
    metadata: {
      user_id: 'test-user-123',
      session_id: 'test-session-456',
    },
  }),

  /**
   * Invalid request (missing required fields) for error testing
   */
  invalid: (): Partial<AnthropicRequest> => ({
    // Missing model and messages
    max_tokens: 1000,
  }),

  /**
   * Request with zero max_tokens for testing validation
   */
  zeroTokens: (): Partial<AnthropicRequest> => ({
    model: 'claude-3-sonnet-20240229',
    messages: [TEST_MESSAGES.simpleUser()],
    max_tokens: 0, // Invalid - should be positive
  }),
} as const;

/**
 * HTTP status codes commonly used in testing
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Common test response validation helpers
 */
export const ResponseValidators = {
  /**
   * Validate that response has correct status code
   */
  hasStatus: (response: Response, expectedStatus: number): boolean => {
    return response.status === expectedStatus;
  },

  /**
   * Validate that response has correct content type
   */
  hasContentType: (response: Response, expectedType: string): boolean => {
    const contentType = response.headers.get('content-type');
    return contentType ? contentType.includes(expectedType) : false;
  },

  /**
   * Validate that response has CORS headers
   */
  hasCorsHeaders: (response: Response): boolean => {
    return !!(
      response.headers.get('access-control-allow-origin') &&
      response.headers.get('access-control-allow-methods')
    );
  },

  /**
   * Validate that streaming response has correct headers
   */
  isStreamingResponse: (response: Response): boolean => {
    return (
      ResponseValidators.hasContentType(response, 'text/event-stream') &&
      response.headers.get('cache-control') === 'no-cache' &&
      response.headers.get('connection') === 'keep-alive'
    );
  },

  /**
   * Validate that response is a valid JSON API response
   */
  isJsonResponse: (response: Response): boolean => {
    return (
      ResponseValidators.hasStatus(response, HTTP_STATUS.OK) &&
      ResponseValidators.hasContentType(response, 'application/json')
    );
  },

  /**
   * Validate that response is a valid error response
   */
  isErrorResponse: (response: Response): boolean => {
    return (
      response.status >= 400 &&
      ResponseValidators.hasContentType(response, 'application/json')
    );
  },
} as const;

/**
 * Utility to extract and parse JSON from a Response object
 * 
 * @param response - The Response object to parse
 * @returns Promise resolving to the parsed JSON data
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/endpoint');
 * const data = await parseJsonResponse(response);
 * ```
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  if (!ResponseValidators.hasContentType(response, 'application/json')) {
    throw new Error(`Expected JSON response, got ${response.headers.get('content-type')}`);
  }
  
  const text = await response.text();
  if (!text.trim()) {
    throw new Error('Response body is empty');
  }
  
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility to read and parse streaming response chunks
 * 
 * @param response - The streaming Response object
 * @returns AsyncGenerator yielding parsed chunks
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/stream-endpoint');
 * for await (const chunk of parseStreamingResponse(response)) {
 *   console.log('Received chunk:', chunk);
 * }
 * ```
 */
export async function* parseStreamingResponse(response: Response): AsyncGenerator<string, void, unknown> {
  if (!ResponseValidators.isStreamingResponse(response)) {
    throw new Error('Response is not a valid streaming response');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6); // Remove 'data: ' prefix
          if (data !== '[DONE]') {
            yield data;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}