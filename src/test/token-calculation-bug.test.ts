/**
 * Test suite for token calculation bug fix.
 * Reproduces and validates the fix for incorrect total_tokens calculation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logAiInteraction } from '../lib/services/message-logger';
import { AiInteraction } from '../lib/db/models/AiInteraction';
import type { AnthropicRequest, AnthropicResponse } from '../lib/ai/types';

describe('Token Calculation Bug Fix', () => {
  beforeEach(async () => {
    // Clean up any existing test data
    await AiInteraction.destroy({ where: {} });
  });

  afterEach(async () => {
    // Clean up after each test
    await AiInteraction.destroy({ where: {} });
  });

  it('should correctly calculate total_tokens as sum of prompt_tokens + completion_tokens', async () => {
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
      content: [{ type: 'text', text: 'Hi there!' }],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 22, // prompt tokens
        output_tokens: 1, // completion tokens
      },
    };

    // Act
    const interaction = await logAiInteraction({
      request: mockRequest,
      response: mockResponse,
      responseTime: 1000,
      statusCode: 200,
    });

    // Assert
    expect(interaction).not.toBeNull();
    expect(interaction!.promptTokens).toBe(22);
    expect(interaction!.completionTokens).toBe(1);
    expect(interaction!.totalTokens).toBe(23); // Should be 22 + 1 = 23, not 1

    // Verify the data was saved correctly to the database
    const savedInteraction = await AiInteraction.findByPk(interaction!.id);
    expect(savedInteraction).not.toBeNull();
    expect(savedInteraction!.promptTokens).toBe(22);
    expect(savedInteraction!.completionTokens).toBe(1);
    expect(savedInteraction!.totalTokens).toBe(23); // This should pass after the fix
  });

  it('should handle missing usage data gracefully', async () => {
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
      content: [{ type: 'text', text: 'Hi there!' }],
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
      responseTime: 1000,
      statusCode: 200,
    });

    // Assert
    expect(interaction).not.toBeNull();
    expect(interaction!.promptTokens).toBe(0);
    expect(interaction!.completionTokens).toBe(0);
    expect(interaction!.totalTokens).toBe(0);
  });

  it('should handle partial usage data correctly', async () => {
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
      content: [{ type: 'text', text: 'Hi there!' }],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 15,
        // Missing output_tokens
      } as any,
    };

    // Act
    const interaction = await logAiInteraction({
      request: mockRequest,
      response: mockResponse,
      responseTime: 1000,
      statusCode: 200,
    });

    // Assert
    expect(interaction).not.toBeNull();
    expect(interaction!.promptTokens).toBe(15);
    expect(interaction!.completionTokens).toBeNull();
    expect(interaction!.totalTokens).toBe(15); // Should be just input_tokens when output_tokens is missing
  });

  it('should calculate total_tokens with zero completion tokens', async () => {
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
      content: [{ type: 'text', text: '' }],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 0,
      },
    };

    // Act
    const interaction = await logAiInteraction({
      request: mockRequest,
      response: mockResponse,
      responseTime: 1000,
      statusCode: 200,
    });

    // Assert
    expect(interaction).not.toBeNull();
    expect(interaction!.promptTokens).toBe(10);
    expect(interaction!.completionTokens).toBe(0);
    expect(interaction!.totalTokens).toBe(10); // Should be 10 + 0 = 10
  });
});
