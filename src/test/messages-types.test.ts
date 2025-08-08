import { describe, it, expect } from 'vitest';
import type { AiInteractionData } from '../lib/types/messages.js';
import { transformAiInteractionToDisplay, MESSAGES_CONSTANTS } from '../lib/types/messages.js';

describe('Messages Types', () => {
  describe('MESSAGES_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(MESSAGES_CONSTANTS.MAX_PAGINATION_PAGES).toBe(10);
      expect(MESSAGES_CONSTANTS.PAGINATION_CENTER_OFFSET).toBe(5);
      expect(MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH).toBe(100);
    });
  });

  describe('transformAiInteractionToDisplay', () => {
    const mockInteraction: AiInteractionData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      model: 'gpt-4',
      request: { prompt: 'Hello world' },
      response: { content: 'Hi there!' },
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      responseTimeMs: 250,
      statusCode: 200,
      error: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should transform basic interaction correctly', () => {
      const result = transformAiInteractionToDisplay(mockInteraction);

      expect(result.id).toBe(mockInteraction.id);
      expect(result.model).toBe(mockInteraction.model);
      expect(result.createdAt).toBe(mockInteraction.createdAt);
      expect(result.responseTime).toBe(250);
      expect(result.totalTokens).toBe(15);
      expect(result.promptTokens).toBe(10);
      expect(result.completionTokens).toBe(5);
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeUndefined();
      expect(result.isSuccess).toBe(true);
    });

    it('should handle request preview truncation', () => {
      const longRequest = { prompt: 'a'.repeat(150) };
      const interaction = { ...mockInteraction, request: longRequest };

      const result = transformAiInteractionToDisplay(interaction);

      expect(result.requestPreview).toHaveLength(103); // 100 chars + '...'
      expect(result.requestPreview).toMatch(/\.\.\.$/); // Ends with '...'
    });

    it('should handle response preview truncation', () => {
      const longResponse = { content: 'b'.repeat(150) };
      const interaction = { ...mockInteraction, response: longResponse };

      const result = transformAiInteractionToDisplay(interaction);

      expect(result.responsePreview).toHaveLength(103); // 100 chars + '...'
      expect(result.responsePreview).toMatch(/\.\.\.$/); // Ends with '...'
    });

    it('should handle failed interactions', () => {
      const failedInteraction = {
        ...mockInteraction,
        error: 'API timeout',
        statusCode: 500,
      };

      const result = transformAiInteractionToDisplay(failedInteraction);

      expect(result.error).toBe('API timeout');
      expect(result.statusCode).toBe(500);
      expect(result.isSuccess).toBe(false);
    });

    it('should handle missing optional fields', () => {
      const minimalInteraction: AiInteractionData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        model: 'gpt-4',
        request: { prompt: 'test' },
        response: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        responseTimeMs: null,
        statusCode: null,
        error: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      const result = transformAiInteractionToDisplay(minimalInteraction);

      expect(result.responseTime).toBeUndefined();
      expect(result.totalTokens).toBeUndefined();
      expect(result.promptTokens).toBeUndefined();
      expect(result.completionTokens).toBeUndefined();
      expect(result.statusCode).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.responsePreview).toBeUndefined();
      expect(result.isSuccess).toBe(false); // Undefined status code means not successful
    });

    it('should handle invalid JSON gracefully', () => {
      const interaction = {
        ...mockInteraction,
        request: 'invalid json' as unknown,
        response: 'also invalid' as unknown,
      };

      const result = transformAiInteractionToDisplay(interaction);

      expect(result.requestPreview).toBe('invalid json');
      expect(result.responsePreview).toBe('also invalid');
    });

    it('should handle null request data', () => {
      const interaction = {
        ...mockInteraction,
        request: null,
      };

      const result = transformAiInteractionToDisplay(interaction);

      expect(result.requestPreview).toBe('No request data');
    });
  });
});
