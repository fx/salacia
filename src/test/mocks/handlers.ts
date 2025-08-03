import { http, HttpResponse } from 'msw';
import type { AnthropicRequest } from '../../lib/ai/types';
import { createAnthropicResponse, createStreamingResponse } from '../fixtures/anthropic-responses';

/**
 * MSW request handlers for mocking external API calls
 *
 * This module defines mock handlers for various external services
 * that the Salacia API integrates with, ensuring tests don't make
 * real network requests.
 */

/**
 * Mock handlers for Anthropic API endpoints
 */
export const anthropicHandlers = [
  /**
   * Mock handler for Anthropic messages API - non-streaming
   */
  http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    const body = (await request.json()) as AnthropicRequest;

    // Validate request structure
    if (!body.messages || !Array.isArray(body.messages)) {
      return HttpResponse.json(
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'messages field is required and must be an array',
          },
        },
        { status: 400 }
      );
    }

    if (!body.max_tokens || typeof body.max_tokens !== 'number') {
      return HttpResponse.json(
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'max_tokens field is required and must be a number',
          },
        },
        { status: 400 }
      );
    }

    // Check if streaming is requested
    if (body.stream === true) {
      return createStreamingResponse(body);
    }

    // Return standard response
    const response = createAnthropicResponse(body);
    return HttpResponse.json(response);
  }),

  /**
   * Mock handler for invalid API key scenarios
   */
  http.post('https://api.anthropic.com/v1/messages', ({ request }) => {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey || apiKey === 'invalid-key') {
      return HttpResponse.json(
        {
          type: 'error',
          error: {
            type: 'authentication_error',
            message: 'Invalid API key provided',
          },
        },
        { status: 401 }
      );
    }
  }),

  /**
   * Mock handler for rate limiting scenarios
   */
  http.post('https://api.anthropic.com/v1/messages', () => {
    // This handler can be activated in specific tests
    return HttpResponse.json(
      {
        type: 'error',
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded. Please try again later.',
        },
      },
      {
        status: 429,
        headers: {
          'retry-after': '60',
        },
      }
    );
  }),
];

/**
 * Mock handlers for OpenAI API endpoints (for future use)
 */
export const openaiHandlers = [
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mocked OpenAI response',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 18,
      },
    });
  }),
];

/**
 * Default request handlers combining all service mocks
 */
export const handlers = [...anthropicHandlers, ...openaiHandlers];
