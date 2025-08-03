/**
 * AI Provider Configuration Utilities
 * 
 * Manages different AI service providers and their configurations.
 * Provides a unified interface for working with multiple AI providers.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';

/**
 * Supported AI provider types
 */
export const PROVIDER_TYPES = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GROQ: 'groq',
} as const;

export type ProviderType = typeof PROVIDER_TYPES[keyof typeof PROVIDER_TYPES];

/**
 * Provider configuration schema for validation
 */
export const ProviderConfigSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([PROVIDER_TYPES.ANTHROPIC, PROVIDER_TYPES.OPENAI, PROVIDER_TYPES.GROQ]),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1),
  isActive: z.boolean().default(true),
  configuration: z.record(z.any()).optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Provider-specific model configurations
 */
export const PROVIDER_MODELS = {
  [PROVIDER_TYPES.ANTHROPIC]: {
    'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229': 'claude-3-opus-20240229',
  },
  [PROVIDER_TYPES.OPENAI]: {
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4-turbo',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
  },
  [PROVIDER_TYPES.GROQ]: {
    'llama-3.1-70b-versatile': 'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant': 'llama-3.1-8b-instant',
    'mixtral-8x7b-32768': 'mixtral-8x7b-32768',
  },
} as const;

/**
 * Creates a language model instance based on provider configuration
 * 
 * @param config Provider configuration
 * @param model Model identifier
 * @returns Configured language model instance
 */
export function createLanguageModel(
  config: ProviderConfig,
  model: string
): LanguageModel {
  switch (config.type) {
    case PROVIDER_TYPES.ANTHROPIC:
      return anthropic(model, {
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });

    case PROVIDER_TYPES.OPENAI:
      return openai(model, {
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });

    case PROVIDER_TYPES.GROQ:
      // Groq uses OpenAI-compatible API
      return openai(model, {
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.groq.com/openai/v1',
      });

    default:
      throw new Error(`Unsupported provider type: ${config.type}`);
  }
}

/**
 * Validates if a model is supported by the given provider
 * 
 * @param providerType Provider type
 * @param model Model identifier
 * @returns True if model is supported
 */
export function isModelSupported(
  providerType: ProviderType,
  model: string
): boolean {
  const supportedModels = PROVIDER_MODELS[providerType];
  return Object.values(supportedModels).includes(model as any);
}

/**
 * Gets default model for a provider type
 * 
 * @param providerType Provider type
 * @returns Default model identifier
 */
export function getDefaultModel(providerType: ProviderType): string {
  switch (providerType) {
    case PROVIDER_TYPES.ANTHROPIC:
      return PROVIDER_MODELS.anthropic['claude-3-5-sonnet-20241022'];
    case PROVIDER_TYPES.OPENAI:
      return PROVIDER_MODELS.openai['gpt-4o'];
    case PROVIDER_TYPES.GROQ:
      return PROVIDER_MODELS.groq['llama-3.1-70b-versatile'];
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

/**
 * Provider configuration error types
 */
export class ProviderConfigurationError extends Error {
  constructor(message: string, public providerType?: ProviderType) {
    super(message);
    this.name = 'ProviderConfigurationError';
  }
}

export class UnsupportedModelError extends Error {
  constructor(model: string, providerType: ProviderType) {
    super(`Model '${model}' is not supported by provider '${providerType}'`);
    this.name = 'UnsupportedModelError';
  }
}