/**
 * MSW handlers for mocking Anthropic API responses
 * 
 * These handlers provide realistic API responses for testing
 * infrastructure components without making real API calls.
 */

import { http, HttpResponse } from 'msw';
import type { AnthropicRequest, AnthropicResponse } from '../../lib/ai/types';
import { TEST_CONFIG } from '../config';

// Simple test utility for generating IDs
const generateTestId = (): string => {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Mock response data
const createMockResponse = (request: AnthropicRequest): AnthropicResponse => ({
  id: `msg_${generateTestId()}`,
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: `Mock response for model ${request.model}. This is a test response.`,
    },
  ],
  model: request.model,
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 50,
    output_tokens: 25,
  },
});

// Anthropic API handlers
export const anthropicHandlers = [
  // Successful message completion
  http.post(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages`, async ({ request }) => {
    const body = await request.json() as AnthropicRequest;
    
    // Validate required fields
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return HttpResponse.json(
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Missing required fields',
          },
        },
        { status: 400 }
      );
    }

    // Check for streaming
    if (body.stream) {
      // Return streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send message_start event
          const messageStart = {
            type: 'message_start',
            message: {
              id: `msg_${generateTestId()}`,
              type: 'message',
              role: 'assistant',
              content: [],
              model: body.model,
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 50, output_tokens: 0 },
            },
          };
          controller.enqueue(
            encoder.encode(`event: message_start\ndata: ${JSON.stringify(messageStart)}\n\n`)
          );

          // Send content
          const contentDelta = {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: 'Test streaming response' },
          };
          controller.enqueue(
            encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify(contentDelta)}\n\n`)
          );

          // End stream
          const messageStop = { type: 'message_stop' };
          controller.enqueue(
            encoder.encode(`event: message_stop\ndata: ${JSON.stringify(messageStop)}\n\n`)
          );

          controller.close();
        },
      });

      return new HttpResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Return regular JSON response
    return HttpResponse.json(createMockResponse(body), { status: 200 });
  }),

  // Authentication error
  http.post(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages/auth-error`, () => {
    return HttpResponse.json(
      {
        type: 'error',
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
        },
      },
      { status: 401 }
    );
  }),

  // Rate limit error
  http.post(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages/rate-limit`, () => {
    return HttpResponse.json(
      {
        type: 'error',
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded',
        },
      },
      { status: 429 }
    );
  }),

  // Server error
  http.post(`${TEST_CONFIG.anthropic.baseUrl}/v1/messages/server-error`, () => {
    return HttpResponse.json(
      {
        type: 'error',
        error: {
          type: 'api_error',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }),
];