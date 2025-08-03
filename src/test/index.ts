/**
 * Test Suite Entry Point and Utilities
 * 
 * This file provides centralized exports for all test fixtures, handlers,
 * utilities, and configuration to make testing components easy to access
 * and maintain.
 */

// Re-export all test setup and configuration
export * from './setup';

// Re-export fixtures
export * from './fixtures/anthropic-handlers';

/**
 * Test assertion helpers for validating AI service responses
 */
export const testAssertions = {
  /**
   * Validate an Anthropic API response structure
   */
  validateAnthropicResponse: (response: any) => {
    expect(response).toBeDefined();
    expect(response.id).toMatch(/^msg_/);
    expect(response.type).toBe('message');
    expect(response.role).toBe('assistant');
    expect(response.content).toBeInstanceOf(Array);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toBeDefined();
    expect(response.model).toBeDefined();
    expect(response.stop_reason).toMatch(/^(end_turn|max_tokens|stop_sequence)$/);
    expect(response.usage).toBeDefined();
    expect(response.usage.input_tokens).toBeGreaterThan(0);
    expect(response.usage.output_tokens).toBeGreaterThan(0);
  },

  /**
   * Validate an Anthropic API error response
   */
  validateAnthropicError: (error: any, expectedType?: string) => {
    expect(error).toBeDefined();
    expect(error.type).toBe('error');
    expect(error.error).toBeDefined();
    expect(error.error.type).toBeDefined();
    expect(error.error.message).toBeDefined();
    
    if (expectedType) {
      expect(error.error.type).toBe(expectedType);
    }
  },

  /**
   * Validate streaming response format
   */
  validateStreamingResponse: (streamText: string) => {
    expect(streamText).toContain('event: message_start');
    expect(streamText).toContain('data: ');
    expect(streamText).toContain('event: message_stop');
    
    // Validate SSE format
    const lines = streamText.split('\n');
    const eventLines = lines.filter(line => line.startsWith('event: '));
    const dataLines = lines.filter(line => line.startsWith('data: '));
    
    expect(eventLines.length).toBeGreaterThan(0);
    expect(dataLines.length).toBeGreaterThan(0);
  },
};

/**
 * Environment utilities for test management
 */
export const testEnvironment = {
  /**
   * Setup function for tests that need clean state
   */
  setupCleanState: () => {
    // Clear any existing mocks
    vi.clearAllMocks();
    
    // Reset any global state if needed
    // This can be expanded as the application grows
  },

  /**
   * Cleanup function for tests
   */
  cleanup: () => {
    // Perform any necessary cleanup
    vi.restoreAllMocks();
  },

  /**
   * Validate test environment is properly configured
   */
  validateEnvironment: () => {
    expect(process.env.NODE_ENV).toBe('test');
  },
};

/**
 * Mock data factories for consistent test data
 */
export const mockDataFactory = {
  /**
   * Create a basic Anthropic request
   */
  createBasicRequest: (overrides: any = {}) => ({
    model: 'claude-3-haiku-20240307',
    messages: [
      {
        role: 'user' as const,
        content: 'Hello, world!',
      },
    ],
    max_tokens: 100,
    ...overrides,
  }),

  /**
   * Create a streaming request
   */
  createStreamingRequest: (overrides: any = {}) => ({
    ...mockDataFactory.createBasicRequest(),
    stream: true,
    ...overrides,
  }),

  /**
   * Create a multimodal request
   */
  createMultimodalRequest: (overrides: any = {}) => ({
    model: 'claude-3-haiku-20240307',
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'Describe this image:',
          },
        ],
      },
    ],
    max_tokens: 100,
    ...overrides,
  }),

  /**
   * Create a system message request
   */
  createSystemMessageRequest: (systemMessage: string, overrides: any = {}) => ({
    model: 'claude-3-haiku-20240307',
    system: systemMessage,
    messages: [
      {
        role: 'user' as const,
        content: 'Hello!',
      },
    ],
    max_tokens: 100,
    ...overrides,
  }),
};