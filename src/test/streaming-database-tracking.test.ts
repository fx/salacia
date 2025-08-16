/**
 * Tests for streaming response database tracking functionality.
 *
 * Verifies that streaming responses properly update the database
 * with complete response data when the stream finishes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AiInteraction } from '../lib/db/models/AiInteraction';
import { logAiInteraction, updateAiInteraction } from '../lib/services/message-logger';
import { createTrackingStream } from '../lib/ai/streaming-tracker';
import type { AnthropicRequest, AnthropicResponse } from '../lib/ai/types';

describe('Streaming Database Tracking', () => {
  beforeEach(async () => {
    // Clean up any existing test data
    await AiInteraction.destroy({ where: {}, force: true });
  });

  afterEach(async () => {
    // Clean up test data
    await AiInteraction.destroy({ where: {}, force: true });
  });

  it('should create initial database record for streaming request', async () => {
    const mockRequest: AnthropicRequest = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      stream: true,
      messages: [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ],
    };

    // Log initial streaming interaction
    const interaction = await logAiInteraction({
      request: mockRequest,
      response: undefined, // Streaming response not complete yet
      responseTime: 1200,
      statusCode: 200,
      providerId: 'test-provider-id',
    });

    expect(interaction).toBeTruthy();
    expect(interaction?.model).toBe('claude-3-haiku-20240307');
    expect(interaction?.providerId).toBe('test-provider-id');
    expect(interaction?.response).toBeUndefined();
    expect(interaction?.statusCode).toBe(200);
    expect(interaction?.responseTimeMs).toBe(1200);
  });

  it('should update database record with complete response after streaming', async () => {
    const mockRequest: AnthropicRequest = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      stream: true,
      messages: [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ],
    };

    // Create initial interaction record
    const interaction = await logAiInteraction({
      request: mockRequest,
      response: undefined,
      responseTime: 1200,
      statusCode: 200,
      providerId: 'test-provider-id',
    });

    expect(interaction).toBeTruthy();
    if (!interaction) {
      throw new Error('interaction is null or undefined');
    }
    const interactionId = interaction.id;

    // Simulate complete response after streaming
    const completeResponse: AnthropicResponse = {
      id: 'msg_123456789',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: "Hello! I'm doing well, thank you for asking. How can I help you today?",
        },
      ],
      model: 'claude-3-haiku-20240307',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 12,
        output_tokens: 18,
      },
    };

    // Update the interaction with complete response
    const updatedInteraction = await updateAiInteraction({
      interactionId,
      response: completeResponse,
    });

    expect(updatedInteraction).toBeTruthy();

    // Verify the database was updated
    const dbInteraction = await AiInteraction.findByPk(interactionId);
    expect(dbInteraction).toBeTruthy();
    expect(dbInteraction?.response).toBeTruthy();
    expect(
      (dbInteraction?.response as { content?: Array<{ text?: string }> })?.content?.[0]?.text
    ).toContain("Hello! I'm doing well");
    expect(dbInteraction?.promptTokens).toBe(12);
    expect(dbInteraction?.completionTokens).toBe(18);
    expect(dbInteraction?.totalTokens).toBe(30); // 12 + 18
  });

  it('should create tracking stream that forwards data correctly', async () => {
    // Create a mock streaming response
    const mockStreamData = [
      'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-haiku-20240307","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" there!"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":5}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ];

    const encoder = new TextEncoder();
    const mockStream = new ReadableStream({
      start(controller) {
        mockStreamData.forEach(chunk => {
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
      },
    });

    // Create initial interaction record
    const interaction = await logAiInteraction({
      request: {
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }],
      } as AnthropicRequest,
      response: undefined,
      responseTime: 1000,
      statusCode: 200,
      providerId: 'test-provider-id',
    });

    expect(interaction).toBeTruthy();
    if (!interaction) {
      throw new Error('Failed to create interaction');
    }

    // Create tracking stream
    const trackingStream = createTrackingStream(mockStream, interaction.id);

    // Read all data from the tracking stream
    const reader = trackingStream.getReader();
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Verify data was forwarded correctly
    const decoder = new TextDecoder();
    const allData = chunks.map(chunk => decoder.decode(chunk)).join('');
    expect(allData).toContain('Hello there!');
    expect(allData).toContain('message_start');
    expect(allData).toContain('message_stop');

    // Allow time for async database update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify database was updated
    const updatedInteraction = await AiInteraction.findByPk(interaction!.id);
    expect(updatedInteraction?.response).toBeTruthy();
    expect(
      (updatedInteraction?.response as { content?: Array<{ text?: string }> })?.content?.[0]?.text
    ).toBe('Hello there!');
    expect(updatedInteraction?.promptTokens).toBe(10);
    expect(updatedInteraction?.completionTokens).toBe(5);
    expect(updatedInteraction?.totalTokens).toBe(15);
  });
});
