import { HttpResponse } from 'msw';
import type { AnthropicRequest, AnthropicResponse } from '../../lib/ai/types';

/**
 * Test fixtures for Anthropic API responses
 *
 * This module provides factory functions and pre-built fixtures
 * for creating realistic Anthropic API response payloads for testing.
 */

/**
 * Generates a unique message ID for testing
 *
 * @returns Unique message ID string
 */
export function generateMessageId(): string {
  return `msg_test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a basic Anthropic API response
 *
 * @param request - The original request (used to determine model, etc.)
 * @param overrides - Properties to override in the response
 * @returns Complete Anthropic response object
 */
export function createAnthropicResponse(
  request: AnthropicRequest,
  overrides: Partial<AnthropicResponse> = {}
): AnthropicResponse {
  const defaultResponse: AnthropicResponse = {
    id: generateMessageId(),
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'This is a test response from the mocked Anthropic API.',
      },
    ],
    model: request.model,
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: request.messages.reduce((acc, msg) => {
        if (typeof msg.content === 'string') {
          return acc + Math.ceil(msg.content.length / 4); // Rough token estimation
        }
        return acc + 10; // Rough estimation for complex content
      }, 0),
      output_tokens: 25, // Default output token count
    },
  };

  return {
    ...defaultResponse,
    ...overrides,
  };
}

/**
 * Creates a streaming response for Anthropic API
 *
 * @param request - The original request
 * @returns HttpResponse with streaming data
 */
export function createStreamingResponse(request: AnthropicRequest): Response {
  const messageId = generateMessageId();

  // Create Server-Sent Events stream
  const events = [
    // Message start event
    {
      event: 'message_start',
      data: {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          content: [],
          model: request.model,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 0 },
        },
      },
    },
    // Content block start
    {
      event: 'content_block_start',
      data: {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      },
    },
    // Content deltas
    {
      event: 'content_block_delta',
      data: {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hello! ' },
      },
    },
    {
      event: 'content_block_delta',
      data: {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'This is a ' },
      },
    },
    {
      event: 'content_block_delta',
      data: {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'streaming response.' },
      },
    },
    // Content block stop
    {
      event: 'content_block_stop',
      data: {
        type: 'content_block_stop',
        index: 0,
      },
    },
    // Message delta (final usage)
    {
      event: 'message_delta',
      data: {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: 25 },
      },
    },
    // Message stop
    {
      event: 'message_stop',
      data: {
        type: 'message_stop',
      },
    },
  ];

  // Convert events to SSE format
  const sseData = events
    .map(event => `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`)
    .join('');

  return HttpResponse.text(sseData, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Creates an error response for various error scenarios
 *
 * @param errorType - Type of error to simulate
 * @param message - Error message
 * @param status - HTTP status code
 * @returns Error response object
 */
export function createErrorResponse(errorType: string, message: string, status: number = 400) {
  return HttpResponse.json(
    {
      type: 'error',
      error: {
        type: errorType,
        message,
      },
    },
    { status }
  );
}

/**
 * Pre-built response fixtures for common test scenarios
 */
export const responseFixtures = {
  /**
   * Standard successful response
   */
  successfulResponse: {
    id: 'msg_test_success',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: 'Hello! I am Claude, an AI assistant created by Anthropic.',
      },
    ],
    model: 'claude-3-sonnet-20240229',
    stop_reason: 'end_turn' as const,
    stop_sequence: null,
    usage: {
      input_tokens: 12,
      output_tokens: 18,
    },
  },

  /**
   * Response that was stopped due to max tokens
   */
  maxTokensResponse: {
    id: 'msg_test_max_tokens',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: 'This is a response that was cut off due to reaching the maximum token limit...',
      },
    ],
    model: 'claude-3-sonnet-20240229',
    stop_reason: 'max_tokens' as const,
    stop_sequence: null,
    usage: {
      input_tokens: 50,
      output_tokens: 1000,
    },
  },

  /**
   * Response stopped by a stop sequence
   */
  stopSequenceResponse: {
    id: 'msg_test_stop_seq',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: 'This response was stopped by a stop sequence',
      },
    ],
    model: 'claude-3-sonnet-20240229',
    stop_reason: 'stop_sequence' as const,
    stop_sequence: '\n\n',
    usage: {
      input_tokens: 25,
      output_tokens: 15,
    },
  },

  /**
   * Long response with high token usage
   */
  longResponse: {
    id: 'msg_test_long',
    type: 'message' as const,
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: 'This is a very long response that would contain a lot of detailed information, explanations, examples, and comprehensive coverage of the topic at hand. It represents the kind of response that would use a significant number of tokens and provide extensive value to the user through its depth and breadth of content.',
      },
    ],
    model: 'claude-3-sonnet-20240229',
    stop_reason: 'end_turn' as const,
    stop_sequence: null,
    usage: {
      input_tokens: 20,
      output_tokens: 150,
    },
  },
};
