import { describe, it, expect } from 'vitest';
import { createAnthropicRequest, requestFixtures } from './fixtures/anthropic-requests';
import { createAnthropicResponse, responseFixtures } from './fixtures/anthropic-responses';
import { createMockRequest, assertions } from './utils/request-helpers';

/**
 * Infrastructure tests to verify the testing setup is working correctly
 *
 * These tests validate that:
 * - Test fixtures generate valid data
 * - Mock utilities work as expected
 * - MSW integration is functioning
 * - Type validation is working
 */

describe('Testing Infrastructure', () => {
  describe('Request Fixtures', () => {
    it('should create valid Anthropic request objects', () => {
      const request = createAnthropicRequest();

      expect(request).toHaveProperty('model');
      expect(request).toHaveProperty('messages');
      expect(request).toHaveProperty('max_tokens');
      expect(Array.isArray(request.messages)).toBe(true);
      expect(request.messages.length).toBeGreaterThan(0);
      expect(typeof request.max_tokens).toBe('number');
    });

    it('should allow overriding request properties', () => {
      const customModel = 'claude-3-opus-20240229';
      const customMaxTokens = 2000;

      const request = createAnthropicRequest({
        model: customModel,
        max_tokens: customMaxTokens,
      });

      expect(request.model).toBe(customModel);
      expect(request.max_tokens).toBe(customMaxTokens);
    });

    it('should create streaming requests correctly', () => {
      const streamingRequest = requestFixtures.streamingChatCompletion;

      expect(streamingRequest.stream).toBe(true);
      expect(streamingRequest).toHaveProperty('model');
      expect(streamingRequest).toHaveProperty('messages');
    });

    it('should create requests with system prompts', () => {
      const systemRequest = requestFixtures.withSystemPrompt;

      expect(systemRequest).toHaveProperty('system');
      expect(typeof systemRequest.system).toBe('string');
      expect(systemRequest.system && systemRequest.system.length).toBeGreaterThan(0);
    });
  });

  describe('Response Fixtures', () => {
    it('should create valid Anthropic response objects', () => {
      const request = createAnthropicRequest();
      const response = createAnthropicResponse(request);

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
    });

    it('should use the same model from request in response', () => {
      const customModel = 'claude-3-opus-20240229';
      const request = createAnthropicRequest({ model: customModel });
      const response = createAnthropicResponse(request);

      expect(response.model).toBe(customModel);
    });

    it('should include usage information', () => {
      const request = createAnthropicRequest();
      const response = createAnthropicResponse(request);

      expect(response.usage).toHaveProperty('input_tokens');
      expect(response.usage).toHaveProperty('output_tokens');
      expect(typeof response.usage.input_tokens).toBe('number');
      expect(typeof response.usage.output_tokens).toBe('number');
      expect(response.usage.input_tokens).toBeGreaterThan(0);
      expect(response.usage.output_tokens).toBeGreaterThan(0);
    });
  });

  describe('Mock Request Utilities', () => {
    it('should create mock Request objects with correct properties', () => {
      const body = { test: 'data' };
      const headers = { 'x-custom-header': 'test-value' };

      const request = createMockRequest(body, { headers });

      expect(request instanceof Request).toBe(true);
      expect(request.method).toBe('POST');
      expect(request.headers.get('content-type')).toBe('application/json');
      expect(request.headers.get('x-custom-header')).toBe('test-value');
    });

    it('should stringify object bodies automatically', async () => {
      const body = { messages: ['hello'] };
      const request = createMockRequest(body);

      const requestBody = await request.text();
      const parsedBody = JSON.parse(requestBody);

      expect(parsedBody).toEqual(body);
    });

    it('should preserve string bodies as-is', async () => {
      const body = '{"raw": "json"}';
      const request = createMockRequest(body);

      const requestBody = await request.text();

      expect(requestBody).toBe(body);
    });
  });

  describe('Response Assertions', () => {
    it('should validate Anthropic response structure', () => {
      const validResponse = responseFixtures.successfulResponse;

      expect(() => {
        assertions.isValidAnthropicResponse(validResponse);
      }).not.toThrow();
    });

    it('should reject invalid response objects', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalidResponse = { not: 'valid' } as any;

      expect(() => {
        assertions.isValidAnthropicResponse(invalidResponse);
      }).toThrow();
    });

    it('should validate response content structure', () => {
      const response = responseFixtures.successfulResponse;

      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0]).toHaveProperty('text');
      expect(typeof response.content[0].text).toBe('string');
    });
  });

  describe('Fixture Consistency', () => {
    it('should have consistent structure across all request fixtures', () => {
      Object.values(requestFixtures).forEach(fixture => {
        expect(fixture).toHaveProperty('model');
        expect(fixture).toHaveProperty('messages');
        expect(fixture).toHaveProperty('max_tokens');
        expect(Array.isArray(fixture.messages)).toBe(true);
      });
    });

    it('should have consistent structure across all response fixtures', () => {
      Object.values(responseFixtures).forEach(fixture => {
        expect(fixture).toHaveProperty('id');
        expect(fixture).toHaveProperty('type', 'message');
        expect(fixture).toHaveProperty('role', 'assistant');
        expect(fixture).toHaveProperty('content');
        expect(fixture).toHaveProperty('usage');
      });
    });
  });
});
