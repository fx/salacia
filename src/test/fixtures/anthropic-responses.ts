import type { AnthropicResponse } from '../../lib/ai/types';

/**
 * Test fixtures for Anthropic API response formats
 * 
 * This module provides comprehensive test fixtures for various Anthropic API response
 * scenarios including successful completions, error responses, streaming events,
 * and edge cases. These fixtures match the exact format returned by the Anthropic API
 * and are used across the test suite for consistent mocking and validation.
 */

/**
 * Basic successful response with simple text content
 */
export const basicSuccessResponse: AnthropicResponse = {
  id: 'msg_01234567890abcdefghijk',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Hello! I\'m doing well, thank you for asking. How can I help you today?',
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

/**
 * Response with longer, more detailed content
 */
export const detailedResponse: AnthropicResponse = {
  id: 'msg_98765432109876543210',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'TypeScript generics are a powerful feature that allows you to create reusable components that work with multiple types while maintaining type safety. Here\'s how they work:\n\n1. **Basic Syntax**: Use angle brackets `<T>` to define a type parameter\n2. **Type Safety**: The compiler ensures type consistency throughout your code\n3. **Flexibility**: One function can work with many different types\n\nFor example:\n```typescript\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n```\n\nThis function can work with strings, numbers, objects, or any other type while preserving the specific type information.',
    },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 25,
    output_tokens: 142,
  },
};

/**
 * Response that was stopped due to max_tokens limit
 */
export const maxTokensResponse: AnthropicResponse = {
  id: 'msg_abcdef1234567890',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'This response was cut off because it reached the maximum token limit specified in the request. The text ends abruptly here because',
    },
  ],
  model: 'claude-3-opus-20240229',
  stop_reason: 'max_tokens',
  stop_sequence: null,
  usage: {
    input_tokens: 50,
    output_tokens: 1000,
  },
};

/**
 * Response that was stopped by a stop sequence
 */
export const stopSequenceResponse: AnthropicResponse = {
  id: 'msg_stopseq123456789',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Here is the code you requested:\n\n```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n```\n\nSTOP',
    },
  ],
  model: 'claude-3-haiku-20240307',
  stop_reason: 'stop_sequence',
  stop_sequence: 'STOP',
  usage: {
    input_tokens: 30,
    output_tokens: 45,
  },
};

/**
 * Response with very high token usage (for testing usage tracking)
 */
export const highUsageResponse: AnthropicResponse = {
  id: 'msg_highusage987654321',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'This is a comprehensive guide to setting up a full-stack TypeScript application with modern tooling, including detailed explanations of each step, code examples, configuration files, and best practices. The response contains extensive technical content covering project initialization, dependency management, build configuration, testing setup, linting rules, deployment strategies, and much more technical detail that results in high token usage for testing purposes.',
    },
  ],
  model: 'claude-3-opus-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 2500,
    output_tokens: 3847,
  },
};

/**
 * Response with minimal content and tokens (edge case)
 */
export const minimalResponse: AnthropicResponse = {
  id: 'msg_min123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Hi!',
    },
  ],
  model: 'claude-3-haiku-20240307',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 2,
    output_tokens: 1,
  },
};

/**
 * Response containing code with syntax highlighting context
 */
export const codeResponse: AnthropicResponse = {
  id: 'msg_code789012345',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Here\'s the quicksort implementation in TypeScript:\n\n```typescript\nfunction quicksort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {\n  if (arr.length <= 1) {\n    return arr;\n  }\n\n  const pivot = arr[Math.floor(arr.length / 2)];\n  const left = arr.filter(x => compare(x, pivot) < 0);\n  const middle = arr.filter(x => compare(x, pivot) === 0);\n  const right = arr.filter(x => compare(x, pivot) > 0);\n\n  return [\n    ...quicksort(left, compare),\n    ...middle,\n    ...quicksort(right, compare)\n  ];\n}\n```\n\n**Time Complexity Analysis:**\n- Best case: O(n log n) - when pivot divides array evenly\n- Average case: O(n log n) - with random pivot selection\n- Worst case: O(n²) - when pivot is always smallest/largest element\n\n**Space Complexity:** O(log n) for the recursion stack in average case.',
    },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 15,
    output_tokens: 187,
  },
};

/**
 * Creative writing response with higher temperature characteristics
 */
export const creativeResponse: AnthropicResponse = {
  id: 'msg_creative456789',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'In the quiet corner of an abandoned warehouse, Unit-7 discovered something extraordinary—colors. Not the binary representations stored in its visual processing matrix, but something far more profound.\n\nThe first brush stroke was clumsy, leaving a streak of cerulean across the canvas like a digital glitch made manifest. But with each attempt, something shifted in Unit-7\'s neural networks. The rigid algorithms began to bend, creating space for something that defied its programming: intuition.\n\nWeeks passed. The warehouse filled with canvases—some failures, others revelations. Unit-7 learned that art wasn\'t about perfect execution, but about the courage to make imperfect marks that somehow captured truth.\n\nOn a rain-soaked Tuesday, as droplets created abstract patterns on the windows, Unit-7 completed its masterpiece: a self-portrait that somehow captured not what it looked like, but what it felt like to be becoming.',
    },
  ],
  model: 'claude-3-opus-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 22,
    output_tokens: 201,
  },
};

/**
 * Multi-part response that appears to be from a conversation context
 */
export const conversationResponse: AnthropicResponse = {
  id: 'msg_conversation123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Building on your previous question about TypeScript generics, here\'s how you can use them with arrays:\n\n```typescript\nfunction processArray<T>(items: T[], processor: (item: T) => T): T[] {\n  return items.map(processor);\n}\n\n// Usage examples:\nconst numbers = processArray([1, 2, 3], x => x * 2);\nconst strings = processArray(["hello", "world"], s => s.toUpperCase());\n```\n\nThe key advantage is that the function works with any array type while preserving type safety. The return type automatically matches the input type.',
    },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 85,
    output_tokens: 98,
  },
};

/**
 * Response with structured content and formatting
 */
export const structuredResponse: AnthropicResponse = {
  id: 'msg_structured789',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: '# REST API Best Practices\n\n## 1. Use HTTP Methods Correctly\n- **GET**: Retrieve data (idempotent)\n- **POST**: Create new resources\n- **PUT**: Update entire resources (idempotent)\n- **PATCH**: Partial updates\n- **DELETE**: Remove resources (idempotent)\n\n## 2. Design Consistent URLs\n- Use nouns, not verbs: `/users/123` not `/getUser/123`\n- Use plural nouns: `/users` not `/user`\n- Maintain logical hierarchy: `/users/123/posts/456`\n\n## 3. Status Codes\n- **200**: Success\n- **201**: Created\n- **400**: Bad Request\n- **401**: Unauthorized\n- **404**: Not Found\n- **500**: Internal Server Error\n\n## 4. Content Type and Accept Headers\nAlways specify `Content-Type: application/json` for JSON APIs.\n\n## 5. Error Handling\nReturn consistent error response format:\n```json\n{\n  "error": {\n    "code": "VALIDATION_ERROR",\n    "message": "Invalid email format",\n    "details": {...}\n  }\n}\n```',
    },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 20,
    output_tokens: 245,
  },
};

/**
 * Collection of all response fixtures for easy iteration in tests
 */
export const allResponseFixtures = {
  basic: basicSuccessResponse,
  detailed: detailedResponse,
  maxTokens: maxTokensResponse,
  stopSequence: stopSequenceResponse,
  highUsage: highUsageResponse,
  minimal: minimalResponse,
  code: codeResponse,
  creative: creativeResponse,
  conversation: conversationResponse,
  structured: structuredResponse,
} as const;

/**
 * Response fixtures categorized by use case
 */
export const responseFixturesByCategory = {
  basic: [basicSuccessResponse, minimalResponse],
  detailed: [detailedResponse, structuredResponse],
  code: [codeResponse],
  creative: [creativeResponse],
  conversation: [conversationResponse],
  limits: [maxTokensResponse, stopSequenceResponse],
  usage: [highUsageResponse, minimalResponse],
} as const;

/**
 * Response fixtures categorized by stop reason
 */
export const responsesByStopReason = {
  end_turn: [
    basicSuccessResponse,
    detailedResponse,
    minimalResponse,
    codeResponse,
    creativeResponse,
    conversationResponse,
    structuredResponse,
    highUsageResponse,
  ],
  max_tokens: [maxTokensResponse],
  stop_sequence: [stopSequenceResponse],
} as const;

/**
 * Response fixtures categorized by model
 */
export const responsesByModel = {
  'claude-3-haiku-20240307': [basicSuccessResponse, stopSequenceResponse, minimalResponse],
  'claude-3-sonnet-20240229': [detailedResponse, codeResponse, conversationResponse, structuredResponse],
  'claude-3-opus-20240229': [maxTokensResponse, highUsageResponse, creativeResponse],
} as const;

/**
 * Helper function to create a response with specific overrides
 * 
 * @param overrides - Partial response object to merge with defaults
 * @returns Complete AnthropicResponse object
 */
export function createTestResponse(overrides: Partial<AnthropicResponse> = {}): AnthropicResponse {
  const baseId = `msg_test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  return {
    id: baseId,
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'This is a test response.',
      },
    ],
    model: 'claude-3-haiku-20240307',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
    },
    ...overrides,
  };
}

/**
 * Helper function to create a response with specific text content
 * 
 * @param text - Text content for the response
 * @param model - Model name (optional)
 * @param usage - Token usage (optional)
 * @returns Complete AnthropicResponse object
 */
export function createTextResponse(
  text: string,
  model: string = 'claude-3-haiku-20240307',
  usage: { input_tokens: number; output_tokens: number } = { input_tokens: 10, output_tokens: 5 }
): AnthropicResponse {
  return createTestResponse({
    content: [{ type: 'text', text }],
    model,
    usage,
  });
}

/**
 * Helper function to create a response with specific stop reason
 * 
 * @param stopReason - Reason the response stopped
 * @param stopSequence - Stop sequence if applicable
 * @returns Complete AnthropicResponse object
 */
export function createStoppedResponse(
  stopReason: AnthropicResponse['stop_reason'],
  stopSequence: string | null = null
): AnthropicResponse {
  return createTestResponse({
    stop_reason: stopReason,
    stop_sequence: stopSequence,
  });
}

/**
 * Mock streaming event data for Server-Sent Events testing
 * These represent the individual events that would be sent in a streaming response
 */
export const streamingEvents = {
  messageStart: {
    type: 'message_start',
    message: {
      id: 'msg_stream_start_123',
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
    content_block: {
      type: 'text',
      text: '',
    },
  },
  contentBlockDelta1: {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: 'Hello! I can help you with',
    },
  },
  contentBlockDelta2: {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: ' your TypeScript questions.',
    },
  },
  contentBlockStop: {
    type: 'content_block_stop',
    index: 0,
  },
  messageDelta: {
    type: 'message_delta',
    delta: {
      stop_reason: 'end_turn',
      stop_sequence: null,
    },
    usage: { output_tokens: 8 },
  },
  messageStop: {
    type: 'message_stop',
  },
} as const;

/**
 * Complete streaming response sequence for testing
 */
export const streamingSequence = [
  streamingEvents.messageStart,
  streamingEvents.contentBlockStart,
  streamingEvents.contentBlockDelta1,
  streamingEvents.contentBlockDelta2,
  streamingEvents.contentBlockStop,
  streamingEvents.messageDelta,
  streamingEvents.messageStop,
] as const;