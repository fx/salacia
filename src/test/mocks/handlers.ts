import { http, HttpResponse } from 'msw';
import type { AnthropicRequest, AnthropicMessage } from '../../lib/ai/types';
import {
  basicSuccessResponse,
  detailedResponse,
  codeResponse,
  creativeResponse,
  minimalResponse,
  maxTokenResponse,
  stopSequenceResponse,
  structuredResponse,
  errorResponses,
  streamingEvents,
  createCustomResponse,
  createStreamingSequence,
} from '../fixtures/anthropic-responses';

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
 * Analyzes request content to determine the appropriate response type
 * 
 * @param request - The Anthropic API request
 * @returns Response type classification
 */
function analyzeRequestContent(request: AnthropicRequest): string {
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
    if (block.type === 'text' && block.text) {
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

      const events = createStreamingSequence(responseText, requestBody.model);
      const stream = new ReadableStream({
        start(controller) {
          events.forEach((event, index) => {
            setTimeout(() => {
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
              
              if (index === events.length - 1) {
                controller.close();
              }
            }, index * 100); // 100ms delay between events
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
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
        'Connection': 'keep-alive',
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
export const anthropicAuthErrorHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
    return HttpResponse.json(errorResponses.authError, { status: 401 });
  }
);

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
export const anthropicRateLimitHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
    return HttpResponse.json(errorResponses.rateLimitError, { status: 429 });
  }
);

/**
 * Server error handler (500)
 */
export const anthropicServerErrorHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
    return HttpResponse.json(errorResponses.serverError, { status: 500 });
  }
);

/**
 * Overloaded/timeout error handler (503)
 */
export const anthropicTimeoutHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
    return HttpResponse.json(errorResponses.overloadedError, { status: 503 });
  }
);

/**
 * Handler collections for different testing scenarios
 */

/**
 * Default handlers for standard testing
 * These are the primary handlers used in most tests
 */
export const defaultHandlers = [
  anthropicMessagesHandler,
];

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
export const streamingHandlers = [
  anthropicStreamingHandler,
];

/**
 * All handlers combined for comprehensive testing
 */
export const allHandlers = [
  ...defaultHandlers,
  ...streamingHandlers,
];

/**
 * Utility function to create a custom handler for specific test needs
 * 
 * @param matcher - Function to match request conditions
 * @param response - Response to return when matched
 * @param status - HTTP status code (default: 200)
 * @returns MSW HTTP handler
 */
export function createCustomHandler(
  matcher: (request: AnthropicRequest) => boolean,
  response: any,
  status: number = 200
) {
  return http.post(`${ANTHROPIC_API_BASE}/v1/messages`, async ({ request }) => {
    const requestBody = (await request.json()) as AnthropicRequest;
    
    if (matcher(requestBody)) {
      return HttpResponse.json(response, { status });
    }
    
    // Fall back to default response
    return HttpResponse.json(basicSuccessResponse);
  });
}

/**
 * Helper function to create handlers for specific models
 * 
 * @param model - Model name to match
 * @param response - Response to return for this model
 * @returns MSW HTTP handler
 */
export function createModelHandler(model: string, response: any) {
  return createCustomHandler(
    (request: AnthropicRequest) => request.model === model,
    response
  );
}

/**
 * Helper function to create handlers that simulate usage-based responses
 * 
 * @param baseResponse - Base response template
 * @returns MSW HTTP handler that calculates usage based on request
 */
export function createUsageAwareHandler(baseResponse: any) {
  return http.post(`${ANTHROPIC_API_BASE}/v1/messages`, async ({ request }) => {
    const requestBody = (await request.json()) as AnthropicRequest;
    
    // Simple token estimation with proper type checking - FIX FOR TYPE ERROR
    const inputTokens = requestBody.messages.reduce((total, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : 
        msg.content.reduce((sum, block) => {
          const textLength = typeof block.text === 'string' ? block.text.length : 0;
          return sum + textLength;
        }, 0);
      return total + Math.ceil(content.length / 4);
    }, 0);
    
    const outputTokens = Math.ceil(baseResponse.content[0].text.length / 4);
    
    return HttpResponse.json({
      ...baseResponse,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    });
  });
}