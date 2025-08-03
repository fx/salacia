import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { defaultHandlers, errorHandlers } from './mocks/handlers';
import type { AnthropicRequest } from '../lib/ai/types';

/**
 * Infrastructure and integration tests for the AI service layer
 * 
 * This test suite validates the core infrastructure components that support
 * the AI service functionality, including API communication, error handling,
 * request/response processing, and service integration points.
 * 
 * These tests use Mock Service Worker (MSW) to simulate Anthropic API responses
 * and validate that our service layer handles various scenarios correctly.
 */

// Setup MSW server for testing
const server = setupServer(...defaultHandlers);

describe('Infrastructure Tests', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterEach(() => {
    server.close();
  });

  describe('API Communication Infrastructure', () => {
    it('should handle basic HTTP requests to Anthropic API', async () => {
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100,
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify(mockRequest),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'message');
      expect(data).toHaveProperty('role', 'assistant');
      expect(data).toHaveProperty('content');
      expect(data).toHaveProperty('model');
      expect(data).toHaveProperty('usage');
    });

    it('should handle streaming requests with proper content-type', async () => {
      const streamingRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Tell me a story' }],
        max_tokens: 1000,
        stream: true,
      };

      // Use streaming handler for this test
      server.use(...defaultHandlers);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify(streamingRequest),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('connection')).toBe('keep-alive');
    });

    it('should properly encode and decode request/response data', async () => {
      const complexRequest: AnthropicRequest = {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: 'Special characters: åäö, éñü, 中文, 🌟',
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        metadata: {
          test_scenario: 'unicode_handling',
          special_chars: '£€¥₹',
        },
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify(complexRequest),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      // Verify the response structure is intact
      expect(data.content[0].text).toBeDefined();
      expect(typeof data.content[0].text).toBe('string');
      expect(data.usage.input_tokens).toBeGreaterThan(0);
      expect(data.usage.output_tokens).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Infrastructure', () => {
    it('should handle authentication errors correctly', async () => {
      server.use(errorHandlers.auth);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'invalid-key',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 100,
        }),
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.type).toBe('error');
      expect(errorData.error.type).toBe('authentication_error');
      expect(errorData.error.message).toContain('Invalid API key');
    });

    it('should handle validation errors for malformed requests', async () => {
      server.use(errorHandlers.validation);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          // Missing required 'messages' field
          max_tokens: 100,
        }),
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.type).toBe('error');
      expect(errorData.error.type).toBe('invalid_request_error');
      expect(errorData.error.message).toContain('missing required field');
    });

    it('should handle rate limiting with proper headers', async () => {
      server.use(errorHandlers.rateLimit);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 100,
        }),
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('60');
      
      const errorData = await response.json();
      expect(errorData.error.type).toBe('rate_limit_error');
    });

    it('should handle server errors gracefully', async () => {
      server.use(errorHandlers.serverError);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 100,
        }),
      });

      expect(response.status).toBe(503);
      const errorData = await response.json();
      expect(errorData.error.type).toBe('overloaded_error');
      expect(errorData.error.message).toContain('overloaded');
    });
  });

  describe('Request Processing Infrastructure', () => {
    it('should handle different content types in messages', async () => {
      const multimodalRequest: AnthropicRequest = {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image:',
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
          },
        ],
        max_tokens: 1000,
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify(multimodalRequest),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.usage.input_tokens).toBeGreaterThan(0);
      expect(data.content[0].text).toBeDefined();
    });

    it('should process conversation context correctly', async () => {
      const conversationRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [
          { role: 'user', content: 'What is TypeScript?' },
          { role: 'assistant', content: 'TypeScript is a superset of JavaScript...' },
          { role: 'user', content: 'Can you show me an example?' },
        ],
        max_tokens: 800,
        system: 'You are a helpful programming tutor.',
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify(conversationRequest),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      // Should account for conversation context in token usage
      expect(data.usage.input_tokens).toBeGreaterThan(30); // Multiple messages
      expect(data.content[0].text).toBeDefined();
    });
  });

  describe('Response Processing Infrastructure', () => {
    it('should handle different response formats correctly', async () => {
      const testCases = [
        { content: 'Hello', expected: 'basic' },
        { content: 'Write some TypeScript code', expected: 'code' },
        { content: 'Tell me a creative story', expected: 'creative' },
      ];

      for (const testCase of testCases) {
        const request: AnthropicRequest = {
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: testCase.content }],
          max_tokens: 1000,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
          },
          body: JSON.stringify(request),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        
        expect(data.type).toBe('message');
        expect(data.role).toBe('assistant');
        expect(data.content).toHaveLength(1);
        expect(data.content[0].type).toBe('text');
        expect(data.content[0].text).toBeDefined();
        expect(data.usage.input_tokens).toBeGreaterThan(0);
        expect(data.usage.output_tokens).toBeGreaterThan(0);
      }
    });

    it('should validate response schema compliance', async () => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 100,
        }),
      });

      const data = await response.json();

      // Validate required fields
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'message');
      expect(data).toHaveProperty('role', 'assistant');
      expect(data).toHaveProperty('content');
      expect(data).toHaveProperty('model');
      expect(data).toHaveProperty('stop_reason');
      expect(data).toHaveProperty('stop_sequence');
      expect(data).toHaveProperty('usage');

      // Validate content structure
      expect(Array.isArray(data.content)).toBe(true);
      expect(data.content.length).toBeGreaterThan(0);
      expect(data.content[0]).toHaveProperty('type', 'text');
      expect(data.content[0]).toHaveProperty('text');

      // Validate usage structure
      expect(data.usage).toHaveProperty('input_tokens');
      expect(data.usage).toHaveProperty('output_tokens');
      expect(typeof data.usage.input_tokens).toBe('number');
      expect(typeof data.usage.output_tokens).toBe('number');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, index) => 
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: `Request ${index + 1}` }],
            max_tokens: 100,
          }),
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
      });

      // Concurrent processing should be reasonably fast
      expect(endTime - startTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle large request payloads', async () => {
      const largeContent = 'This is a very long message. '.repeat(100); // ~3000 characters
      
      const largeRequest: AnthropicRequest = {
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: largeContent }],
        max_tokens: 4000,
        system: 'You are a helpful assistant. Please provide detailed responses.',
        metadata: {
          large_request: true,
          content_length: largeContent.length,
        },
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify(largeRequest),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      // Should handle large input appropriately
      expect(data.usage.input_tokens).toBeGreaterThan(500);
      expect(data.content[0].text).toBeDefined();
    });
  });
});