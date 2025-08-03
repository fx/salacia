/**
 * Test suite entry point and configuration
 * 
 * This module serves as the central entry point for the test suite,
 * providing global test setup, configuration, and exports for all
 * testing utilities and fixtures.
 * 
 * It ensures consistent test environment setup across all test files
 * and provides easy access to commonly used testing utilities.
 */

// Re-export all test fixtures for easy access
export * from './fixtures/anthropic-requests';
export * from './fixtures/anthropic-responses';

// Re-export MSW handlers for test setup
export * from './mocks/handlers';

// Test utilities and helpers
export {
  createTestRequest,
  createTestMessage,
} from './fixtures/anthropic-requests';

export {
  createTestResponse,
  createTextResponse,
  createStoppedResponse,
} from './fixtures/anthropic-responses';

export {
  createCustomHandler,
  createModelHandler,
  createUsageAwareHandler,
} from './mocks/handlers';

/**
 * Common test configuration and constants
 */
export const TEST_CONFIG = {
  /**
   * Default timeout for API requests in tests (milliseconds)
   */
  DEFAULT_TIMEOUT: 5000,

  /**
   * Default test API key for mocked requests
   */
  TEST_API_KEY: 'test-anthropic-key',

  /**
   * Base URL for Anthropic API in tests
   */
  ANTHROPIC_API_BASE: 'https://api.anthropic.com',

  /**
   * Common model configurations for testing
   */
  MODELS: {
    HAIKU: 'claude-3-haiku-20240307',
    SONNET: 'claude-3-sonnet-20240229',
    OPUS: 'claude-3-opus-20240229',
  },

  /**
   * Standard test user identifiers
   */
  TEST_USERS: {
    BASIC: 'test-user-basic',
    POWER: 'test-user-power',
    ADMIN: 'test-user-admin',
  },

  /**
   * Token limits for testing different scenarios
   */
  TOKEN_LIMITS: {
    MINIMAL: 1,
    SMALL: 100,
    MEDIUM: 1000,
    LARGE: 4000,
  },
} as const;

/**
 * Test environment utilities
 */
export const testUtils = {
  /**
   * Generate a unique test ID for test isolation
   * 
   * @param prefix - Optional prefix for the ID
   * @returns Unique test identifier
   */
  generateTestId: (prefix: string = 'test'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${random}`;
  },

  /**
   * Create a delay for testing async operations
   * 
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Mock console methods for testing
   * 
   * @returns Object with restore function to reset console methods
   */
  mockConsole: () => {
    const originalConsole = { ...console };
    const mockLog = vi.fn();
    const mockError = vi.fn();
    const mockWarn = vi.fn();

    console.log = mockLog;
    console.error = mockError;
    console.warn = mockWarn;

    return {
      log: mockLog,
      error: mockError,
      warn: mockWarn,
      restore: () => {
        Object.assign(console, originalConsole);
      },
    };
  },

  /**
   * Create a mock fetch function for specific test scenarios
   * 
   * @param response - Mock response to return
   * @param status - HTTP status code (default: 200)
   * @returns Mock fetch function
   */
  createMockFetch: (response: any, status: number = 200) => {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Map([['content-type', 'application/json']]),
      json: vi.fn().mockResolvedValue(response),
      text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    });
  },
} as const;

/**
 * Global test setup function
 * 
 * This function should be called before running tests to ensure
 * proper environment setup and configuration.
 */
export function setupTestEnvironment(): void {
  // Set up global test environment variables
  process.env.NODE_ENV = 'test';
  
  // Mock global objects that might not be available in test environment
  if (typeof global.fetch === 'undefined') {
    global.fetch = vi.fn();
  }

  // Set up default console behavior in tests
  if (process.env.VITEST_QUIET === 'true') {
    console.log = vi.fn();
    console.info = vi.fn();
  }
}

/**
 * Cleanup function for tests
 * 
 * This function should be called after tests to clean up any
 * global state or mocks that might affect other tests.
 */
export function cleanupTestEnvironment(): void {
  // Reset all mocks
  vi.clearAllMocks();
  vi.restoreAllMocks();

  // Clean up environment variables
  delete process.env.TEST_API_KEY;
  delete process.env.TEST_DATABASE_URL;
}

/**
 * Test assertion helpers
 */
export const assertions = {
  /**
   * Assert that a response matches the Anthropic API format
   * 
   * @param response - Response object to validate
   */
  isValidAnthropicResponse: (response: any): void => {
    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('type', 'message');
    expect(response).toHaveProperty('role', 'assistant');
    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('model');
    expect(response).toHaveProperty('usage');
    
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.content[0]).toHaveProperty('type', 'text');
    expect(response.content[0]).toHaveProperty('text');
    
    expect(response.usage).toHaveProperty('input_tokens');
    expect(response.usage).toHaveProperty('output_tokens');
    expect(typeof response.usage.input_tokens).toBe('number');
    expect(typeof response.usage.output_tokens).toBe('number');
  },

  /**
   * Assert that an error response matches the Anthropic API error format
   * 
   * @param errorResponse - Error response object to validate
   */
  isValidAnthropicError: (errorResponse: any): void => {
    expect(errorResponse).toHaveProperty('type', 'error');
    expect(errorResponse).toHaveProperty('error');
    expect(errorResponse.error).toHaveProperty('type');
    expect(errorResponse.error).toHaveProperty('message');
    expect(typeof errorResponse.error.message).toBe('string');
  },

  /**
   * Assert that token usage is reasonable for the given input
   * 
   * @param usage - Usage object from API response
   * @param inputLength - Approximate input length for validation
   */
  hasReasonableTokenUsage: (usage: any, inputLength: number = 0): void => {
    expect(usage.input_tokens).toBeGreaterThan(0);
    expect(usage.output_tokens).toBeGreaterThan(0);
    
    // Rough validation: input tokens should correlate with input length
    if (inputLength > 0) {
      const estimatedInputTokens = Math.ceil(inputLength / 4);
      expect(usage.input_tokens).toBeGreaterThanOrEqual(estimatedInputTokens * 0.5);
      expect(usage.input_tokens).toBeLessThanOrEqual(estimatedInputTokens * 2);
    }
  },
} as const;

// Initialize test environment when this module is imported
setupTestEnvironment();