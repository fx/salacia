import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ProviderConfig, AIProviderType } from './types';

/**
 * Factory for creating AI provider clients using Vercel AI SDK
 */
export class ProviderFactory {
  /**
   * Create a provider client based on configuration
   */
  static createProvider(config: ProviderConfig) {
    switch (config.type) {
      case 'openai':
        return createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.settings?.baseUrl,
          organization: config.settings?.organization,
        });

      case 'anthropic':
        return createAnthropic({
          apiKey: config.apiKey,
          baseURL: config.settings?.baseUrl,
        });

      case 'groq':
        // Groq uses OpenAI-compatible API
        return createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.settings?.baseUrl || 'https://api.groq.com/openai/v1',
        });

      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  /**
   * Get the default model for a provider type
   */
  static getDefaultModel(type: AIProviderType): string {
    switch (type) {
      case 'openai':
        return 'gpt-4-turbo-preview';
      case 'anthropic':
        return 'claude-3-opus-20240229';
      case 'groq':
        return 'mixtral-8x7b-32768';
      default:
        throw new Error(`No default model for provider type: ${type}`);
    }
  }

  /**
   * Get available models for a provider type
   */
  static getAvailableModels(type: AIProviderType): string[] {
    switch (type) {
      case 'openai':
        return ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'];

      case 'anthropic':
        return [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-2.0',
        ];

      case 'groq':
        return ['mixtral-8x7b-32768', 'llama2-70b-4096', 'gemma-7b-it'];

      default:
        return [];
    }
  }

  /**
   * Validate if a model is supported by a provider
   */
  static isModelSupported(type: AIProviderType, model: string): boolean {
    const models = this.getAvailableModels(type);
    return models.includes(model);
  }

  /**
   * Map Anthropic model names to provider-specific model names
   */
  static mapModelName(type: AIProviderType, anthropicModel: string): string {
    // If it's already an Anthropic provider, return as-is
    if (type === 'anthropic') {
      return anthropicModel;
    }

    // Map common Anthropic model names to provider equivalents
    const modelMappings: Record<string, Record<AIProviderType, string>> = {
      'claude-3-opus-20240229': {
        openai: 'gpt-4-turbo-preview',
        anthropic: 'claude-3-opus-20240229',
        groq: 'mixtral-8x7b-32768',
      },
      'claude-3-sonnet-20240229': {
        openai: 'gpt-4',
        anthropic: 'claude-3-sonnet-20240229',
        groq: 'mixtral-8x7b-32768',
      },
      'claude-3-haiku-20240307': {
        openai: 'gpt-3.5-turbo',
        anthropic: 'claude-3-haiku-20240307',
        groq: 'gemma-7b-it',
      },
    };

    const mapping = modelMappings[anthropicModel];
    if (mapping && mapping[type]) {
      return mapping[type];
    }

    // If no mapping found, return the default model for the provider
    return this.getDefaultModel(type);
  }
}
