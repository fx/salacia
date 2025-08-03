import { http, HttpResponse } from 'msw';
import type { AnthropicRequest, AnthropicMessage, AnthropicResponse } from '../../lib/ai/types';

/**
 * MSW request handlers for Anthropic API
 *
 * This module provides intelligent request handlers that analyze request content
 * and parameters to return appropriate responses. Handlers include support for
 * streaming responses, error scenarios, and dynamic response generation based
 * on request characteristics.
 */

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';

/**
 * Streaming event delay in milliseconds
 */
const STREAMING_EVENT_DELAY_MS = 100;

/**
 * Basic response fixtures
 */
const basicSuccessResponse: AnthropicResponse = {
  id: 'msg_01234567890abcdefghijk',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
  model: 'claude-3-haiku-20240307',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 12, output_tokens: 18 },
};

const detailedResponse: AnthropicResponse = {
  id: 'msg_detailed_response',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Here is a detailed explanation of the concept with comprehensive coverage of the topic.',
    },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 45, output_tokens: 85 },
};

const codeResponse: AnthropicResponse = {
  id: 'msg_code_example',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Here\'s a TypeScript example:\n```typescript\nfunction example(): string {\n  return "code";\n}\n```',
    },
  ],
  model: 'claude-3-opus-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 23, output_tokens: 45 },
};

const creativeResponse: AnthropicResponse = {
  id: 'msg_creative_story',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Once upon a time, in a land of endless possibilities, there lived a curious developer...',
    },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 18, output_tokens: 38 },
};

const minimalResponse: AnthropicResponse = {
  id: 'msg_minimal',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'Yes.' }],
  model: 'claude-3-haiku-20240307',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 8, output_tokens: 1 },
};

const structuredResponse: AnthropicResponse = {
  id: 'msg_structured',
  type: 'message',
  role: 'assistant',
  content: [
    { type: 'text', text: '```json\n{"status": "success", "data": {"result": "example"}}\n```' },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 20, output_tokens: 25 },
};

const errorResponses = {
  authError: {
    type: 'error',
    error: { type: 'authentication_error', message: 'Invalid API key provided' },
  },
  validationError: {
    type: 'error',
    error: { type: 'invalid_request_error', message: 'Missing required parameter: messages' },
  },
  rateLimitError: {
    type: 'error',
    error: { type: 'rate_limit_error', message: 'Rate limit exceeded. Please try again later.' },
  },
  serverError: {
    type: 'error',
    error: { type: 'api_error', message: 'Internal server error. Please try again later.' },
  },
  overloadedError: {
    type: 'error',
    error: {
      type: 'overloaded_error',
      message: 'The API is currently overloaded. Please try again later.',
    },
  },
};

const maxTokenResponse: AnthropicResponse = {
  id: 'msg_max_tokens',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'This response was truncated due to max tokens limit.' }],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'max_tokens',
  stop_sequence: null,
  usage: { input_tokens: 25, output_tokens: 10 },
};

const streamingEvents = {
  messageStart: {
    type: 'message_start',
    message: {
      id: 'msg_stream_test',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-3-sonnet-20240229',
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 25, output_tokens: 0 },
    },
  },
  contentBlockStart: {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  },
  contentBlockDelta: {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'Hello! How can I help you today?' },
  },
  contentBlockStop: { type: 'content_block_stop', index: 0 },
  messageDelta: {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null },
    usage: { output_tokens: 8 },
  },
  messageStop: { type: 'message_stop' },
};

/**
 * Analyzes request content to determine the appropriate response type
 *
 * @param request - The Anthropic API request
 * @returns Response type classification
 */
function analyzeRequestContent(request: AnthropicRequest): string {
  // Handle empty messages array
  if (request.messages.length === 0) {
    return 'basic';
  }

  const lastMessage = request.messages[request.messages.length - 1];
  const content = getMessageContent(lastMessage);
  const contentLower = content.toLowerCase();

  // Check for code-related requests
  if (
    contentLower.includes('code') ||
    contentLower.includes('function') ||
    contentLower.includes('typescript') ||
    contentLower.includes('javascript') ||
    contentLower.includes('react') ||
    contentLower.includes('component') ||
    contentLower.includes('implement') ||
    contentLower.includes('write a') ||
    contentLower.includes('create a')
  ) {
    return 'code';
  }

  // Check for structured data requests
  if (
    contentLower.includes('json') ||
    contentLower.includes('api') ||
    contentLower.includes('data structure') ||
    contentLower.includes('object') ||
    contentLower.includes('array')
  ) {
    return 'structured';
  }

  // Check for creative content requests
  if (
    contentLower.includes('story') ||
    contentLower.includes('creative') ||
    contentLower.includes('imagine') ||
    contentLower.includes('write about') ||
    contentLower.includes('tell me about') ||
    contentLower.includes('describe')
  ) {
    return 'creative';
  }

  // Check for detailed explanations
  if (
    contentLower.includes('explain') ||
    contentLower.includes('how does') ||
    contentLower.includes('what is') ||
    contentLower.includes('why') ||
    contentLower.includes('details') ||
    content.length > 100
  ) {
    return 'detailed';
  }

  // Check for minimal responses
  if (
    contentLower.includes('yes') ||
    contentLower.includes('no') ||
    contentLower.includes('true') ||
    contentLower.includes('false') ||
    content.length < 20
  ) {
    return 'minimal';
  }

  return 'basic';
}

/**
 * Extracts text content from an Anthropic message
 *
 * @param message - The message to extract content from
 * @returns Combined text content
 */
function getMessageContent(message: AnthropicMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content.reduce((text, block) => {
    if (block.type === 'text' && typeof block.text === 'string') {
      return text + block.text;
    }
    return text;
  }, '');
}

/**
 * Main Anthropic messages handler with intelligent response routing
 */
export const anthropicMessagesHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  async ({ request }) => {
    const requestBody = (await request.json()) as AnthropicRequest;

    // Handle streaming requests
    if (requestBody.stream) {
      const contentType = analyzeRequestContent(requestBody);
      let responseText = 'This is a streaming response example.';

      switch (contentType) {
        case 'code':
          responseText = 'function example() { return "streaming code"; }';
          break;
        case 'creative':
          responseText = 'Once upon a time, in a streaming world...';
          break;
        case 'detailed':
          responseText = 'Here is a detailed streaming explanation of the concept...';
          break;
      }

      const events = [
        streamingEvents.messageStart,
        streamingEvents.contentBlockStart,
        { ...streamingEvents.contentBlockDelta, delta: { type: 'text_delta', text: responseText } },
        streamingEvents.contentBlockStop,
        streamingEvents.messageDelta,
        streamingEvents.messageStop,
      ];
      const stream = new ReadableStream({
        start(controller) {
          events.forEach((event, index) => {
            setTimeout(() => {
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));

              if (index === events.length - 1) {
                controller.close();
              }
            }, index * STREAMING_EVENT_DELAY_MS);
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Handle max tokens constraint
    if (requestBody.max_tokens && requestBody.max_tokens <= 10) {
      return HttpResponse.json(maxTokenResponse);
    }

    // Analyze content and return appropriate response
    const contentType = analyzeRequestContent(requestBody);

    switch (contentType) {
      case 'code':
        return HttpResponse.json(codeResponse);
      case 'structured':
        return HttpResponse.json(structuredResponse);
      case 'creative':
        return HttpResponse.json(creativeResponse);
      case 'detailed':
        return HttpResponse.json(detailedResponse);
      case 'minimal':
        return HttpResponse.json(minimalResponse);
      default:
        return HttpResponse.json(basicSuccessResponse);
    }
  }
);

/**
 * Streaming-specific handler for testing streaming scenarios
 */
export const anthropicStreamingHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  async ({ request }) => {
    const requestBody = (await request.json()) as AnthropicRequest;

    if (!requestBody.stream) {
      return HttpResponse.json(basicSuccessResponse);
    }

    const events = [
      streamingEvents.messageStart,
      streamingEvents.contentBlockStart,
      streamingEvents.contentBlockDelta,
      streamingEvents.contentBlockStop,
      streamingEvents.messageDelta,
      streamingEvents.messageStop,
    ];

    const stream = new ReadableStream({
      start(controller) {
        events.forEach((event, index) => {
          setTimeout(() => {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));

            if (index === events.length - 1) {
              controller.close();
            }
          }, index * 50);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }
);

/**
 * Error handlers for testing various error scenarios
 */

/**
 * Authentication error handler (401)
 */
export const anthropicAuthErrorHandler = http.post(`${ANTHROPIC_API_BASE}/v1/messages`, () => {
  return HttpResponse.json(errorResponses.authError, { status: 401 });
});

/**
 * Validation error handler (400)
 */
export const anthropicValidationErrorHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
    return HttpResponse.json(errorResponses.validationError, { status: 400 });
  }
);

/**
 * Rate limit error handler (429)
 */
export const anthropicRateLimitHandler = http.post(`${ANTHROPIC_API_BASE}/v1/messages`, () => {
  return HttpResponse.json(errorResponses.rateLimitError, { status: 429 });
});

/**
 * Server error handler (500)
 */
export const anthropicServerErrorHandler = http.post(`${ANTHROPIC_API_BASE}/v1/messages`, () => {
  return HttpResponse.json(errorResponses.serverError, { status: 500 });
});

/**
 * Overloaded/timeout error handler (503)
 */
export const anthropicTimeoutHandler = http.post(`${ANTHROPIC_API_BASE}/v1/messages`, () => {
  return HttpResponse.json(errorResponses.overloadedError, { status: 503 });
});

/**
 * Handler collections for different testing scenarios
 */

/**
 * Default handlers for standard testing
 * These are the primary handlers used in most tests
 */
export const defaultHandlers = [anthropicMessagesHandler];

/**
 * Error scenario handlers for testing error handling
 */
export const errorHandlers = {
  auth: anthropicAuthErrorHandler,
  validation: anthropicValidationErrorHandler,
  rateLimit: anthropicRateLimitHandler,
  serverError: anthropicServerErrorHandler,
  timeout: anthropicTimeoutHandler,
};

/**
 * Streaming-specific handlers
 */
export const streamingHandlers = [anthropicStreamingHandler];

/**
 * All handlers combined for comprehensive testing
 */
export const allHandlers = [...defaultHandlers, ...streamingHandlers];

/**
 * Utility function to create a custom handler for specific test needs
 */
export function createCustomHandler(
  matcher: (_request: AnthropicRequest) => boolean,
  response: AnthropicResponse,
  status: number = 200
) {
  return http.post(`${ANTHROPIC_API_BASE}/v1/messages`, async ({ request }) => {
    const requestBody = (await request.json()) as AnthropicRequest;

    if (matcher(requestBody)) {
      return HttpResponse.json(response, { status });
    }

    return HttpResponse.json(basicSuccessResponse);
  });
}

/**
 * Helper function that calculates usage based on request - FIXES TYPE ERROR from PR #19
 */
export function createUsageAwareHandler(baseResponse: AnthropicResponse) {
  return http.post(`${ANTHROPIC_API_BASE}/v1/messages`, async ({ request }) => {
    const requestBody = (await request.json()) as AnthropicRequest;

    const inputTokens = requestBody.messages.reduce((total, msg) => {
      const contentLength =
        typeof msg.content === 'string'
          ? msg.content.length
          : msg.content.reduce((sum, block) => {
              // FIX: Properly check type before accessing length
              const textLength = typeof block.text === 'string' ? block.text.length : 0;
              return sum + textLength;
            }, 0);
      return total + Math.ceil(contentLength / 4);
    }, 0);

    return HttpResponse.json({
      ...baseResponse,
      usage: {
        input_tokens: inputTokens,
        output_tokens: Math.ceil(baseResponse.content[0].text.length / 4),
      },
    });
  });
}
