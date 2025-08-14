import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { AIProviderType, EnhancedProviderConfig } from './types';
import { TokenManager } from '../auth/token-manager';

/**
 * Factory for creating AI provider clients using Vercel AI SDK
 */
export class ProviderFactory {
  /**
   * Create a provider client based on configuration
   * Supports both API key and OAuth authentication
   */
  static async createProvider(config: EnhancedProviderConfig) {
    // Get authentication credentials based on auth type
    const apiKey = await this.getAuthenticationCredentials(config);

    switch (config.type) {
      case 'openai':
        return createOpenAI({
          apiKey,
          baseURL: config.settings?.baseUrl,
          organization: config.settings?.organization,
        });

      case 'anthropic':
        return createAnthropic({
          apiKey,
          baseURL: config.settings?.baseUrl,
        });

      case 'groq':
        // Groq uses OpenAI-compatible API
        return createOpenAI({
          apiKey,
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
   * Get authentication credentials for a provider config
   * Handles OAuth token refresh and fallback to API key
   */
  static async getAuthenticationCredentials(config: EnhancedProviderConfig): Promise<string> {
    // For OAuth providers, try to get a valid token first
    if (config.authType === 'oauth') {
      try {
        if (!config.id) {
          throw new Error('Provider ID required for OAuth authentication');
        }

        // Get valid OAuth token (automatically refreshes if needed)
        const oauthToken = await TokenManager.getValidToken(config.id);
        return oauthToken;
      } catch (error) {
        console.warn(`OAuth authentication failed for provider ${config.name}:`, error);

        // Fallback to API key if both OAuth and API key are configured
        if (config.apiKey || config.fallbackApiKey) {
          const fallbackKey = config.fallbackApiKey || config.apiKey;
          if (!fallbackKey) {
            throw new Error(`No fallback API key available for provider ${config.name}`);
          }
          console.warn(`Falling back to API key authentication for provider ${config.name}`);
          return fallbackKey;
        }

        throw new Error(
          `OAuth authentication failed and no fallback API key available for provider ${config.name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // For API key providers, validate key exists
    if (config.authType === 'api_key') {
      if (!config.apiKey) {
        throw new Error(`Missing API key for provider ${config.name}`);
      }
      return config.apiKey;
    }

    throw new Error(`Unsupported authentication type: ${config.authType}`);
  }

  /**
   * Check if a provider config has valid authentication
   */
  static async hasValidAuthentication(config: EnhancedProviderConfig): Promise<boolean> {
    try {
      await this.getAuthenticationCredentials(config);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create provider with automatic token refresh for OAuth providers
   */
  static async createProviderWithRefresh(config: EnhancedProviderConfig) {
    // For OAuth providers, ensure token is valid before creating client
    if (config.authType === 'oauth' && config.id) {
      try {
        await TokenManager.getValidToken(config.id);
      } catch (error) {
        console.warn(
          'Token validation failed, will attempt fallback during client creation:',
          error
        );
      }
    }

    return this.createProvider(config);
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
