/**
 * Unit tests for MessageLogger service.
 * Tests the positive behavior of logging AI interactions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logAiInteraction } from '../lib/services/message-logger';
import { AiInteraction } from '../lib/db/models/AiInteraction';
import type { AnthropicRequest, AnthropicResponse } from '../lib/ai/types';

describe('MessageLogger Service', () => {
  beforeEach(async () => {
    // Clean up any existing test data
    await AiInteraction.destroy({ where: {} });
  });

  afterEach(async () => {
    // Clean up after each test
    await AiInteraction.destroy({ where: {} });
  });

  describe('logAiInteraction', () => {
    it('should log successful AI interaction with correct token calculation', async () => {
      // Arrange
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Hello, world!' }],
        max_tokens: 100,
      };

      const mockResponse: AnthropicResponse = {
        id: 'test-response-id',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi there! How can I help you today?' }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 15,
          output_tokens: 8,
        },
      };

      // Act
      const interaction = await logAiInteraction({
        request: mockRequest,
        response: mockResponse,
        responseTime: 1200,
        statusCode: 200,
      });

      // Assert
      expect(interaction).not.toBeNull();
      expect(interaction!.model).toBe('claude-3-sonnet-20240229');
      expect(interaction!.promptTokens).toBe(15);
      expect(interaction!.completionTokens).toBe(8);
      expect(interaction!.totalTokens).toBe(23); // 15 + 8
      expect(interaction!.statusCode).toBe(200);
      expect(interaction!.responseTimeMs).toBe(1200);
      expect(interaction!.error).toBeNull();
      expect(interaction!.request).toEqual(mockRequest);
      expect(interaction!.response).toEqual(mockResponse);

      // Verify persistence
      const savedInteraction = await AiInteraction.findByPk(interaction!.id);
      expect(savedInteraction).not.toBeNull();
      expect(savedInteraction!.totalTokens).toBe(23);
    });

    it('should log failed AI interaction with error details', async () => {
      // Arrange
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Test message' }],
        max_tokens: 50,
      };

      const errorMessage = 'API rate limit exceeded';

      // Act
      const interaction = await logAiInteraction({
        request: mockRequest,
        error: errorMessage,
        responseTime: 500,
        statusCode: 429,
      });

      // Assert
      expect(interaction).not.toBeNull();
      expect(interaction!.model).toBe('claude-3-sonnet-20240229');
      expect(interaction!.error).toBe(errorMessage);
      expect(interaction!.statusCode).toBe(429);
      expect(interaction!.responseTimeMs).toBe(500);
      expect(interaction!.response).toBeNull();
      expect(interaction!.totalTokens).toBeNull();
      expect(interaction!.promptTokens).toBeNull();
      expect(interaction!.completionTokens).toBeNull();
    });

    it('should handle zero token counts correctly', async () => {
      // Arrange
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: '' }],
        max_tokens: 1,
      };

      const mockResponse: AnthropicResponse = {
        id: 'test-response-id',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
      };

      // Act
      const interaction = await logAiInteraction({
        request: mockRequest,
        response: mockResponse,
        responseTime: 300,
        statusCode: 200,
      });

      // Assert
      expect(interaction).not.toBeNull();
      expect(interaction!.promptTokens).toBe(0);
      expect(interaction!.completionTokens).toBe(0);
      expect(interaction!.totalTokens).toBe(0); // 0 + 0
    });

    it('should calculate total tokens when only prompt tokens available', async () => {
      // Arrange
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 10,
      };

      const mockResponse: AnthropicResponse = {
        id: 'test-response-id',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 12,
          // Missing output_tokens
        } as any,
      };

      // Act
      const interaction = await logAiInteraction({
        request: mockRequest,
        response: mockResponse,
        responseTime: 800,
        statusCode: 200,
      });

      // Assert
      expect(interaction).not.toBeNull();
      expect(interaction!.promptTokens).toBe(12);
      expect(interaction!.completionTokens).toBeNull();
      expect(interaction!.totalTokens).toBe(12); // Only prompt tokens
    });

    it('should calculate total tokens when only completion tokens available', async () => {
      // Arrange
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 20,
      };

      const mockResponse: AnthropicResponse = {
        id: 'test-response-id',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test response' }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          // Missing input_tokens
          output_tokens: 5,
        } as any,
      };

      // Act
      const interaction = await logAiInteraction({
        request: mockRequest,
        response: mockResponse,
        responseTime: 600,
        statusCode: 200,
      });

      // Assert
      expect(interaction).not.toBeNull();
      expect(interaction!.promptTokens).toBeNull();
      expect(interaction!.completionTokens).toBe(5);
      expect(interaction!.totalTokens).toBe(5); // Only completion tokens
    });

    it('should handle Error objects correctly', async () => {
      // Arrange
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10,
      };

      const error = new Error('Network timeout');

      // Act
      const interaction = await logAiInteraction({
        request: mockRequest,
        error,
        responseTime: 5000,
        statusCode: 500,
      });

      // Assert
      expect(interaction).not.toBeNull();
      expect(interaction!.error).toBe('Network timeout');
      expect(interaction!.statusCode).toBe(500);
    });

    it('should return null and not throw when database operation fails', async () => {
      // Arrange - Create an invalid request that would cause DB error
      const mockRequest: AnthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10,
      };

      // Mock AiInteraction.create to throw an error
      const originalCreate = AiInteraction.create;
      AiInteraction.create = () => {
        throw new Error('Database connection failed');
      };

      try {
        // Act
        const result = await logAiInteraction({
          request: mockRequest,
          responseTime: 1000,
          statusCode: 200,
        });

        // Assert
        expect(result).toBeNull();
      } finally {
        // Restore original method
        AiInteraction.create = originalCreate;
      }
    });
  });
});
