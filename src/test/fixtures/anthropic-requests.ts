import type { AnthropicRequest, AnthropicMessage } from '../../lib/ai/types';

/**
 * Test fixtures for Anthropic API request formats
 *
 * This module provides comprehensive test fixtures for various Anthropic API request
 * scenarios including simple text messages, multimodal content, streaming requests,
 * and edge cases. These fixtures are used across the test suite to ensure consistent
 * testing of the AI service layer.
 */

/**
 * Simple text message for basic testing
 */
export const simpleUserMessage: AnthropicMessage = {
  role: 'user',
  content: 'Hello, how are you?',
};

/**
 * Assistant message with text content
 */
export const simpleAssistantMessage: AnthropicMessage = {
  role: 'assistant',
  content: 'I am doing well, thank you for asking!',
};

/**
 * System message for context setting
 */
export const systemMessage: AnthropicMessage = {
  role: 'system',
  content: 'You are a helpful AI assistant specialized in coding tasks.',
};

/**
 * User message with multimodal content (text + image)
 */
export const multimodalMessage: AnthropicMessage = {
  role: 'user',
  content: [
    {
      type: 'text',
      text: 'What do you see in this image?',
    },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    },
  ],
};

/**
 * Complex multimodal message with multiple text and image blocks
 */
export const complexMultimodalMessage: AnthropicMessage = {
  role: 'user',
  content: [
    {
      type: 'text',
      text: 'Please analyze these two images and compare them:',
    },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      },
    },
    {
      type: 'text',
      text: 'And this second image:',
    },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      },
    },
    {
      type: 'text',
      text: 'What are the key differences between them?',
    },
  ],
};

/**
 * Long conversation history for context testing
 */
export const conversationHistory: AnthropicMessage[] = [
  {
    role: 'user',
    content: 'Can you help me understand TypeScript generics?',
  },
  {
    role: 'assistant',
    content:
      'TypeScript generics allow you to create reusable components that work with multiple types. They provide a way to create functions, classes, and interfaces that work with a variety of data types while maintaining type safety.',
  },
  {
    role: 'user',
    content: 'Can you show me a simple example?',
  },
  {
    role: 'assistant',
    content:
      'Here\'s a simple example:\n\n```typescript\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n\n// Usage\nconst stringResult = identity<string>("hello");\nconst numberResult = identity<number>(42);\n```\n\nThe `<T>` is a type parameter that acts as a placeholder for the actual type.',
  },
  {
    role: 'user',
    content: 'How would I use this with arrays?',
  },
];

/**
 * Basic Anthropic request with minimal required fields
 */
export const basicRequest: AnthropicRequest = {
  model: 'claude-3-haiku-20240307',
  messages: [simpleUserMessage],
  max_tokens: 1000,
};

/**
 * Request with all optional parameters specified
 */
export const fullParameterRequest: AnthropicRequest = {
  model: 'claude-3-sonnet-20240229',
  messages: [simpleUserMessage],
  max_tokens: 2000,
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  stream: false,
  system: 'You are a helpful AI assistant.',
  metadata: {
    user_id: 'test-user-123',
    conversation_id: 'conv-456',
  },
};

/**
 * Streaming request configuration
 */
export const streamingRequest: AnthropicRequest = {
  model: 'claude-3-opus-20240229',
  messages: [simpleUserMessage],
  max_tokens: 1500,
  stream: true,
  temperature: 0.3,
};

/**
 * Request with multimodal content
 */
export const multimodalRequest: AnthropicRequest = {
  model: 'claude-3-opus-20240229',
  messages: [multimodalMessage],
  max_tokens: 1000,
  temperature: 0.1,
};

/**
 * Request with conversation history
 */
export const conversationRequest: AnthropicRequest = {
  model: 'claude-3-sonnet-20240229',
  messages: conversationHistory,
  max_tokens: 1000,
  system: 'You are an expert programming tutor.',
};

/**
 * Request with system message and conversation
 */
export const systemAndConversationRequest: AnthropicRequest = {
  model: 'claude-3-haiku-20240307',
  messages: [
    {
      role: 'user',
      content: 'Explain the concept of dependency injection.',
    },
  ],
  max_tokens: 800,
  system: 'You are a senior software engineer helping junior developers learn design patterns.',
  temperature: 0.2,
};

/**
 * High temperature creative request
 * Note: temperature 1.5 is intentionally set above typical max (1.0) for edge-case testing
 */
export const creativeRequest: AnthropicRequest = {
  model: 'claude-3-opus-20240229',
  messages: [
    {
      role: 'user',
      content: 'Write a creative short story about a robot learning to paint.',
    },
  ],
  max_tokens: 2000,
  temperature: 1.5, // Intentional edge case: testing high creativity parameters
  top_p: 0.95,
};

/**
 * Low temperature analytical request
 */
export const analyticalRequest: AnthropicRequest = {
  model: 'claude-3-sonnet-20240229',
  messages: [
    {
      role: 'user',
      content: 'Analyze the time complexity of quicksort algorithm.',
    },
  ],
  max_tokens: 1200,
  temperature: 0.1,
  top_p: 0.8,
  top_k: 20,
};

/**
 * Request with large token limit for long-form content
 */
export const longFormRequest: AnthropicRequest = {
  model: 'claude-3-opus-20240229',
  messages: [
    {
      role: 'user',
      content:
        'Write a comprehensive guide to setting up a full-stack TypeScript application with modern tooling.',
    },
  ],
  max_tokens: 4000,
  system: 'You are a technical documentation specialist.',
};

/**
 * Edge case: Request with minimum token limit
 */
export const minimalTokenRequest: AnthropicRequest = {
  model: 'claude-3-haiku-20240307',
  messages: [
    {
      role: 'user',
      content: 'Hi',
    },
  ],
  max_tokens: 1,
};

/**
 * Edge case: Request with maximum reasonable parameters
 * Note: temperature 2.0 is intentionally set above max (1.0) for edge-case testing
 */
export const maximalRequest: AnthropicRequest = {
  model: 'claude-3-opus-20240229',
  messages: conversationHistory,
  max_tokens: 4096,
  temperature: 2.0, // Intentional edge case: testing parameter validation boundaries
  top_p: 1.0,
  top_k: 100,
  stream: false,
  system:
    'You are an expert in all fields of knowledge and provide comprehensive, accurate responses.',
  metadata: {
    user_id: 'power-user-999',
    conversation_id: 'extended-session-789',
    priority: 'high',
    context: 'technical-discussion',
  },
};

/**
 * Request with only text content in structured format
 */
export const structuredContentRequest: AnthropicRequest = {
  model: 'claude-3-sonnet-20240229',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Please provide a structured response about REST API best practices.',
        },
      ],
    },
  ],
  max_tokens: 1500,
  temperature: 0.3,
};

/**
 * Collection of all request fixtures for easy iteration in tests
 */
export const allRequestFixtures = {
  basic: basicRequest,
  fullParameter: fullParameterRequest,
  streaming: streamingRequest,
  multimodal: multimodalRequest,
  conversation: conversationRequest,
  systemAndConversation: systemAndConversationRequest,
  creative: creativeRequest,
  analytical: analyticalRequest,
  longForm: longFormRequest,
  minimalToken: minimalTokenRequest,
  maximal: maximalRequest,
  structuredContent: structuredContentRequest,
} as const;

/**
 * Request fixtures categorized by use case
 */
export const requestFixturesByCategory = {
  basic: [basicRequest, minimalTokenRequest],
  advanced: [fullParameterRequest, maximalRequest],
  streaming: [streamingRequest],
  multimodal: [multimodalRequest], // Fixed: removed AnthropicMessage from AnthropicRequest array
  conversation: [conversationRequest, systemAndConversationRequest],
  creative: [creativeRequest],
  analytical: [analyticalRequest, structuredContentRequest],
  longForm: [longFormRequest],
} as const;

/**
 * Common model configurations used in tests
 */
export const modelConfigurations = {
  haiku: 'claude-3-haiku-20240307',
  sonnet: 'claude-3-sonnet-20240229',
  opus: 'claude-3-opus-20240229',
} as const;

/**
 * Helper function to create a request with specific overrides
 *
 * @param overrides - Partial request object to merge with defaults
 * @returns Complete AnthropicRequest object
 */
export function createTestRequest(overrides: Partial<AnthropicRequest> = {}): AnthropicRequest {
  return {
    model: modelConfigurations.haiku,
    messages: [simpleUserMessage],
    max_tokens: 1000,
    ...overrides,
  };
}

/**
 * Helper function to create a message with specific content
 *
 * @param role - Message role (user, assistant, system)
 * @param content - Message content (string or structured)
 * @returns Complete AnthropicMessage object
 */
export function createTestMessage(
  role: AnthropicMessage['role'],
  content: AnthropicMessage['content']
): AnthropicMessage {
  return { role, content };
}
