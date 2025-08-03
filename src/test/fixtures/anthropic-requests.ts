import type { AnthropicRequest, AnthropicMessage } from '../../lib/ai/types';

/**
 * Test fixtures for Anthropic API requests
 *
 * This module provides factory functions and pre-built fixtures
 * for creating realistic Anthropic API request payloads for testing.
 */

/**
 * Creates a basic Anthropic message object
 *
 * @param role - Message role (system, user, or assistant)
 * @param content - Message content
 * @returns Anthropic message object
 */
export function createMessage(
  role: 'system' | 'user' | 'assistant',
  content: string
): AnthropicMessage {
  return {
    role,
    content,
  };
}

/**
 * Creates a minimal valid Anthropic API request
 *
 * @param overrides - Properties to override in the base request
 * @returns Complete Anthropic request object
 */
export function createAnthropicRequest(
  overrides: Partial<AnthropicRequest> = {}
): AnthropicRequest {
  const defaultRequest: AnthropicRequest = {
    model: 'claude-3-sonnet-20240229',
    messages: [createMessage('user', 'Hello, how are you?')],
    max_tokens: 1000,
    temperature: 0.7,
  };

  return {
    ...defaultRequest,
    ...overrides,
  };
}

/**
 * Creates an Anthropic request with streaming enabled
 *
 * @param overrides - Properties to override in the base request
 * @returns Streaming Anthropic request object
 */
export function createStreamingRequest(
  overrides: Partial<AnthropicRequest> = {}
): AnthropicRequest {
  return createAnthropicRequest({
    stream: true,
    ...overrides,
  });
}

/**
 * Creates an Anthropic request with system message
 *
 * @param systemMessage - System message content
 * @param userMessage - User message content
 * @param overrides - Additional properties to override
 * @returns Anthropic request with system message
 */
export function createRequestWithSystem(
  systemMessage: string,
  userMessage: string,
  overrides: Partial<AnthropicRequest> = {}
): AnthropicRequest {
  return createAnthropicRequest({
    system: systemMessage,
    messages: [createMessage('user', userMessage)],
    ...overrides,
  });
}

/**
 * Creates an Anthropic request with conversation history
 *
 * @param messages - Array of messages forming the conversation
 * @param overrides - Additional properties to override
 * @returns Anthropic request with conversation history
 */
export function createConversationRequest(
  messages: AnthropicMessage[],
  overrides: Partial<AnthropicRequest> = {}
): AnthropicRequest {
  return createAnthropicRequest({
    messages,
    ...overrides,
  });
}

/**
 * Creates an Anthropic request with multimodal content (text + image)
 *
 * @param textContent - Text content
 * @param imageData - Base64 encoded image data
 * @param mediaType - Image media type (e.g., 'image/png')
 * @param overrides - Additional properties to override
 * @returns Anthropic request with multimodal content
 */
export function createMultimodalRequest(
  textContent: string,
  imageData: string,
  mediaType: string = 'image/png',
  overrides: Partial<AnthropicRequest> = {}
): AnthropicRequest {
  return createAnthropicRequest({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: textContent,
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageData,
            },
          },
        ],
      },
    ],
    ...overrides,
  });
}

/**
 * Pre-built request fixtures for common test scenarios
 */
export const requestFixtures = {
  /**
   * Simple chat completion request
   */
  simpleChatCompletion: createAnthropicRequest(),

  /**
   * Streaming chat completion request
   */
  streamingChatCompletion: createStreamingRequest(),

  /**
   * Request with system prompt
   */
  withSystemPrompt: createRequestWithSystem(
    'You are a helpful assistant.',
    'What is the capital of France?'
  ),

  /**
   * Multi-turn conversation request
   */
  multiTurnConversation: createConversationRequest([
    createMessage('user', 'Hello!'),
    createMessage('assistant', 'Hello! How can I help you today?'),
    createMessage('user', 'Can you tell me a joke?'),
  ]),

  /**
   * Request with high temperature for creative responses
   */
  creativeRequest: createAnthropicRequest({
    temperature: 1.0,
    messages: [createMessage('user', 'Write a creative story about a robot.')],
  }),

  /**
   * Request with low temperature for factual responses
   */
  factualRequest: createAnthropicRequest({
    temperature: 0.1,
    messages: [createMessage('user', 'What is 2 + 2?')],
  }),

  /**
   * Request with maximum tokens limit
   */
  maxTokensRequest: createAnthropicRequest({
    max_tokens: 4000,
    messages: [createMessage('user', 'Write a detailed explanation of quantum physics.')],
  }),

  /**
   * Request with top_p sampling
   */
  topPRequest: createAnthropicRequest({
    top_p: 0.9,
    messages: [createMessage('user', 'Generate some ideas for a birthday party.')],
  }),

  /**
   * Request with metadata
   */
  withMetadata: createAnthropicRequest({
    metadata: {
      user_id: 'test-user-123',
      session_id: 'test-session-456',
      source: 'test-suite',
    },
    messages: [createMessage('user', 'Hello with metadata')],
  }),
};
