import { z } from 'zod';

/**
 * Supported AI provider types
 */
export const AIProviderType = z.enum(['openai', 'anthropic', 'groq']);
export type AIProviderType = z.infer<typeof AIProviderType>;

/**
 * Model configuration for AI providers
 */
export const ModelConfig = z.object({
  id: z.string(),
  name: z.string(),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  supportsFunctions: z.boolean().default(false),
  supportsVision: z.boolean().default(false),
  supportsStreaming: z.boolean().default(true),
});
export type ModelConfig = z.infer<typeof ModelConfig>;

/**
 * Provider-specific settings
 */
export const ProviderSettings = z.object({
  baseUrl: z.string().url().optional(),
  organization: z.string().optional(),
  defaultModel: z.string().optional(),
  timeout: z.number().int().positive().default(30000),
  maxRetries: z.number().int().min(0).max(5).default(3),
});
export type ProviderSettings = z.infer<typeof ProviderSettings>;

/**
 * Complete provider configuration
 */
export const ProviderConfig = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: AIProviderType,
  apiKey: z.string(),
  models: z.array(ModelConfig).default([]),
  settings: ProviderSettings.default({}),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

/**
 * Anthropic API message format
 */
export const AnthropicMessage = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.enum(['text', 'image']),
      text: z.string().optional(),
      source: z.object({
        type: z.literal('base64'),
        media_type: z.string(),
        data: z.string(),
      }).optional(),
    })),
  ]),
});
export type AnthropicMessage = z.infer<typeof AnthropicMessage>;

/**
 * Anthropic API request format
 */
export const AnthropicRequest = z.object({
  model: z.string(),
  messages: z.array(AnthropicMessage),
  max_tokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  system: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});
export type AnthropicRequest = z.infer<typeof AnthropicRequest>;

/**
 * Anthropic API response format
 */
export const AnthropicResponse = z.object({
  id: z.string(),
  type: z.literal('message'),
  role: z.literal('assistant'),
  content: z.array(z.object({
    type: z.literal('text'),
    text: z.string(),
  })),
  model: z.string(),
  stop_reason: z.enum(['end_turn', 'max_tokens', 'stop_sequence']).nullable(),
  stop_sequence: z.string().nullable(),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
  }),
});
export type AnthropicResponse = z.infer<typeof AnthropicResponse>;

/**
 * Streaming event types for Server-Sent Events
 */
export const StreamEventType = z.enum([
  'message_start',
  'content_block_start',
  'content_block_delta',
  'content_block_stop',
  'message_delta',
  'message_stop',
  'error',
]);
export type StreamEventType = z.infer<typeof StreamEventType>;