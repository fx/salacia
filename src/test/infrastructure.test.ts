/**
 * Core Infrastructure Tests
 * 
 * This test suite validates the core infrastructure components of the AI service layer,
 * including basic setup validation, MSW server functionality, API endpoint testing basics,
 * and error handling tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { server, TEST_CONFIG, testUtils } from './setup';
import { http, HttpResponse } from 'msw';
import type { AnthropicRequest } from '../lib/ai/types';

describe('Core Infrastructure Tests', () => {
  describe('Basic Infrastructure Setup', () => {
    it('should have test configuration available', () => {
      expect(TEST_CONFIG).toBeDefined();
      expect(TEST_CONFIG.api.baseUrl).toBe('http://localhost:4321');
      expect(TEST_CONFIG.anthropic.apiKey).toBe('test-api-key');
      expect(TEST_CONFIG.models.haiku).toBe('claude-3-haiku-20240307');
    });

    it('should provide test utilities', () => {
      expect(testUtils.generateTestId).toBeDefined();
      expect(testUtils.delay).toBeDefined();
      expect(testUtils.mockConsole).toBeDefined();
      expect(testUtils.restoreConsole).toBeDefined();
    });

    it('should generate unique test IDs', () => {
      const id1 = testUtils.generateTestId();
      const id2 = testUtils.generateTestId();
      
      expect(id1).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should create test delays', async () => {
      const start = Date.now();
      await testUtils.delay(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('MSW Server Functionality', () => {
    it('should have MSW server running', () => {
      expect(server).toBeDefined();
      expect(server.listHandlers()).toHaveLength(4); // 4 handlers defined in anthropic-handlers.ts
    });

    it('should mock successful Anthropic API requests', async () => {
      const mockRequest: AnthropicRequest = {
        model: TEST_CONFIG.models.haiku,
        messages: [
          {
            role: 'user',
            content: 'Hello, world!',
          },
        ],
        max_tokens: 100,
      };

      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_CONFIG.anthropic.apiKey,
        },
        body: JSON.stringify(mockRequest),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        type: 'message',
        role: 'assistant',
        model: TEST_CONFIG.models.haiku,
        stop_reason: 'end_turn',
      });
      expect(data.content).toHaveLength(1);
      expect(data.content[0].type).toBe('text');
      expect(data.usage.input_tokens).toBe(50);
      expect(data.usage.output_tokens).toBe(25);
    });

    it('should handle streaming requests', async () => {
      const mockRequest: AnthropicRequest = {
        model: TEST_CONFIG.models.haiku,
        messages: [{ role: 'user', content: 'Test streaming' }],
        stream: true,
      };

      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_CONFIG.anthropic.apiKey,
        },
        body: JSON.stringify(mockRequest),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');

      const text = await response.text();
      expect(text).toContain('event: message_start');
      expect(text).toContain('event: content_block_delta');
      expect(text).toContain('event: message_stop');
    });

    it('should reset handlers between tests', () => {
      // Add a temporary handler
      server.use(
        http.get('http://test.example/temp', () => {
          return HttpResponse.json({ message: 'temporary' });
        })
      );

      // Verify we have more handlers now
      expect(server.listHandlers()).toHaveLength(5); // 4 original + 1 temporary

      // Reset handlers (this happens automatically in afterEach)
      server.resetHandlers();

      // Verify we're back to original handlers only
      expect(server.listHandlers()).toHaveLength(4);
    });
  });

  describe('API Validation Tests', () => {
    it('should validate required request fields', async () => {
      const invalidRequest = {
        model: '', // Invalid: empty model
        messages: [], // Invalid: empty messages
      };

      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_CONFIG.anthropic.apiKey,
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.type).toBe('error');
      expect(data.error.type).toBe('invalid_request_error');
      expect(data.error.message).toBe('Missing required fields');
    });

    it('should handle valid message structure', async () => {
      const validRequest: AnthropicRequest = {
        model: TEST_CONFIG.models.sonnet,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Test multimodal content',
              },
            ],
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
        top_p: 0.9,
      };

      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_CONFIG.anthropic.apiKey,
        },
        body: JSON.stringify(validRequest),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.model).toBe(TEST_CONFIG.models.sonnet);
    });

    it('should handle system messages', async () => {
      const requestWithSystem: AnthropicRequest = {
        model: TEST_CONFIG.models.haiku,
        system: 'You are a helpful assistant.',
        messages: [
          {
            role: 'user',
            content: 'Hello!',
          },
        ],
        max_tokens: 100,
      };

      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_CONFIG.anthropic.apiKey,
        },
        body: JSON.stringify(requestWithSystem),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.type).toBe('message');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle authentication errors', async () => {
      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages/auth-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'invalid-key',
        },
        body: JSON.stringify({
          model: TEST_CONFIG.models.haiku,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.type).toBe('error');
      expect(data.error.type).toBe('authentication_error');
      expect(data.error.message).toBe('Invalid API key');
    });

    it('should handle rate limit errors', async () => {
      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages/rate-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_CONFIG.anthropic.apiKey,
        },
        body: JSON.stringify({
          model: TEST_CONFIG.models.haiku,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.type).toBe('error');
      expect(data.error.type).toBe('rate_limit_error');
      expect(data.error.message).toBe('Rate limit exceeded');
    });

    it('should handle server errors', async () => {
      const response = await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages/server-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_CONFIG.anthropic.apiKey,
        },
        body: JSON.stringify({
          model: TEST_CONFIG.models.haiku,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.type).toBe('error');
      expect(data.error.type).toBe('api_error');
      expect(data.error.message).toBe('Internal server error');
    });

    it('should handle network errors gracefully', async () => {
      // Override handler to simulate network error
      server.use(
        http.post(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, () => {
          return HttpResponse.error();
        })
      );

      try {
        await fetch(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': TEST_CONFIG.anthropic.apiKey,
          },
          body: JSON.stringify({
            model: TEST_CONFIG.models.haiku,
            messages: [{ role: 'user', content: 'Test' }],
          }),
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Console and Environment Management', () => {
    let originalConsole: typeof console;

    beforeEach(() => {
      originalConsole = testUtils.mockConsole();
    });

    it('should mock console methods', () => {
      console.log('test message');
      console.error('test error');
      console.warn('test warning');

      expect(console.log).toHaveBeenCalledWith('test message');
      expect(console.error).toHaveBeenCalledWith('test error');
      expect(console.warn).toHaveBeenCalledWith('test warning');
    });

    it('should restore console methods', () => {
      // Verify methods are currently mocked
      expect(vi.isMockFunction(console.log)).toBe(true);
      
      // Store reference to the mock before restoring
      const mockLog = console.log;
      
      testUtils.restoreConsole(originalConsole);
      
      // After restoration, console.log should be different from the mock
      expect(console.log).not.toBe(mockLog);
      expect(console.log).toBe(originalConsole.log);
    });
  });
});