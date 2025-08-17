/**
 * Provider-specific implementations that bypass the Vercel AI SDK
 *
 * These custom implementations are used when providers require:
 * - OAuth authentication
 * - Custom headers or request formatting
 * - Special API behaviors
 */

export { AnthropicClient } from './anthropic/client';
export { OllamaClient } from './ollama/client';

// Future provider implementations can be added here:
// export { OpenAIClient } from './openai/client';
// export { GroqClient } from './groq/client';
