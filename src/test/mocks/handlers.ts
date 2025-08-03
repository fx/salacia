import { http, HttpResponse } from 'msw';
import type { AnthropicRequest } from '../../lib/ai/types';
import {
  basicSuccessResponse,
  detailedResponse,
  maxTokensResponse,
  stopSequenceResponse,
  codeResponse,
  creativeResponse,
  minimalResponse,
  createTestResponse,
  createTextResponse,
  streamingEvents,
  streamingSequence,
} from '../fixtures/anthropic-responses';

/**
 * Mock Service Worker handlers for Anthropic API endpoints
 * 
 * This module provides comprehensive HTTP request handlers for testing
 * the Anthropic API integration. It includes handlers for both streaming
 * and non-streaming requests, error scenarios, and various response types.
 * 
 * Handlers are designed to simulate realistic API behavior including
 * proper content types, response times, and edge cases.
 */

/**
 * Base URL for Anthropic API
 */
const ANTHROPIC_API_BASE = 'https://api.anthropic.com';

/**
 * Handler for successful non-streaming chat completions
 * Routes different request patterns to appropriate response fixtures
 */
export const anthropicMessagesHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  async ({ request }) => {
    // Parse the request body
    const requestBody = (await request.json()) as AnthropicRequest;
    
    // Handle different test scenarios based on request content
    const userMessage = requestBody.messages[requestBody.messages.length - 1];
    const messageContent = typeof userMessage.content === 'string' 
      ? userMessage.content 
      : userMessage.content[0]?.text || '';

    // Simulate request processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Route to different responses based on content or parameters
    if (requestBody.stream === true) {
      // Streaming requests should not reach this handler
      return new HttpResponse(null, { status: 400 });
    }

    // Check for max_tokens limit testing
    if (requestBody.max_tokens === 1) {
      return HttpResponse.json(minimalResponse);
    }

    // Check for stop sequence testing
    if (messageContent.includes('STOP') || messageContent.includes('stop sequence')) {
      return HttpResponse.json(stopSequenceResponse);
    }

    // Check for creative/story requests
    if (messageContent.toLowerCase().includes('story') || 
        messageContent.toLowerCase().includes('creative') ||
        requestBody.temperature && requestBody.temperature > 1.0) {
      return HttpResponse.json(creativeResponse);
    }

    // Check for code/technical requests
    if (messageContent.toLowerCase().includes('code') ||
        messageContent.toLowerCase().includes('algorithm') ||
        messageContent.toLowerCase().includes('typescript') ||
        messageContent.toLowerCase().includes('function')) {
      return HttpResponse.json(codeResponse);
    }

    // Check for long-form requests (high max_tokens)
    if (requestBody.max_tokens > 3000) {
      return HttpResponse.json({
        ...detailedResponse,
        usage: {
          input_tokens: requestBody.messages.length * 20,
          output_tokens: Math.min(requestBody.max_tokens, 3847),
        },
      });
    }

    // Check for conversation context (multiple messages)
    if (requestBody.messages.length > 1) {
      return HttpResponse.json({
        ...detailedResponse,
        usage: {
          input_tokens: requestBody.messages.length * 15,
          output_tokens: 142,
        },
      });
    }

    // Default to basic response
    return HttpResponse.json(basicSuccessResponse);
  }
);

/**
 * Handler for streaming chat completions
 * Returns Server-Sent Events stream with proper formatting
 */
export const anthropicStreamingHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  async ({ request }) => {
    const requestBody = (await request.json()) as AnthropicRequest;
    
    if (requestBody.stream !== true) {
      // Non-streaming requests should not reach this handler
      return new HttpResponse(null, { status: 400 });
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send streaming events in sequence
        streamingSequence.forEach((event, index) => {
          setTimeout(() => {
            const eventData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
            
            // Close stream after last event
            if (index === streamingSequence.length - 1) {
              controller.close();
            }
          }, index * 50); // Stagger events by 50ms
        });
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
);

/**
 * Handler for authentication errors (invalid API key)
 */
export const anthropicAuthErrorHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
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
);

/**
 * Handler for validation errors (malformed request)
 */
export const anthropicValidationErrorHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
    return HttpResponse.json(
      {
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: 'Invalid request: missing required field "messages"',
        },
      },
      { status: 400 }
    );
  }
);

/**
 * Handler for rate limiting errors
 */
export const anthropicRateLimitHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
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
          'Retry-After': '60',
        },
      }
    );
  }
);

/**
 * Handler for server errors (503 Service Unavailable)
 */
export const anthropicServerErrorHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  () => {
    return HttpResponse.json(
      {
        type: 'error',
        error: {
          type: 'overloaded_error',
          message: 'Service temporarily overloaded. Please retry your request.',
        },
      },
      { status: 503 }
    );
  }
);

/**
 * Handler for timeout simulation (slow response)
 */
export const anthropicTimeoutHandler = http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  async () => {
    // Simulate a very slow response (useful for timeout testing)
    await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
    return HttpResponse.json(basicSuccessResponse);
  }
);

/**
 * Dynamic handler that can be configured for specific test scenarios
 */
export const configurableAnthropicHandler = (
  responseOverride?: any,
  status?: number,
  delay?: number
) => http.post(
  `${ANTHROPIC_API_BASE}/v1/messages`,
  async () => {
    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const response = responseOverride || basicSuccessResponse;
    return HttpResponse.json(response, { status: status || 200 });
  }
);

/**
 * Default handlers for normal operation
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
    
    // Simple token estimation
    const inputTokens = requestBody.messages.reduce((total, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : 
        msg.content.reduce((sum, block) => sum + (block.text?.length || 0), 0);
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