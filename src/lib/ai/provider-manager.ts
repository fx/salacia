import { ProviderFactory } from './provider-factory';
import { TokenManager } from '../auth/token-manager';
import { AiProvider as AiProviderModel } from '../db/models/AiProvider';
import { OllamaClient } from './providers/ollama/client';
import { getOllamaRunningModels } from './providers/ollama/ps';
import type { AIProviderType, ProviderSettings } from './types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProviderManager');

// Simple AiProvider type definition for compatibility
export interface AiProvider {
  id: string;
  name: string;
  type: string;
  authType: 'api_key' | 'oauth';
  apiKey?: string;
  baseUrl: string | null;
  models: unknown;
  settings: unknown;
  isActive: boolean;
  isDefault: boolean;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthTokenExpiresAt?: Date;
  oauthScope?: string;
  oauthClientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Provider manager for handling AI provider selection and management
 *
 * This service manages the selection of AI providers based on:
 * 1. Environment variables
 * 2. Default fallbacks
 */
export class ProviderManager {
  private static providerCache: Map<string, AiProvider> = new Map();

  /**
   * Update OAuth token for the default OAuth provider
   */
  static async updateOAuthToken(newToken: string): Promise<void> {
    try {
      const providers = await AiProviderModel.findAll({
        where: {
          authType: 'oauth',
          isActive: true,
        },
        order: [
          ['isDefault', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: 1,
      });

      if (providers.length > 0) {
        const provider = providers[0];
        await provider.update({
          oauthAccessToken: newToken,
          oauthTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        });
        logger.debug('Updated OAuth token for provider:', provider.name);
      }
    } catch (error) {
      logger.error('Failed to update OAuth token:', error);
    }
  }

  /**
   * Get the default provider for handling requests
   */
  static async getDefaultProvider(): Promise<AiProvider | null> {
    try {
      // First, check if there's a database provider marked as default
      const { ProviderService } = await import('../services/provider-service');
      const result = await ProviderService.getProviders();
      const providers = result.providers;

      // Find the default provider or any active OAuth provider
      const defaultProvider = providers.find(p => p.isDefault && p.isActive);
      if (defaultProvider) {
        return defaultProvider as AiProvider;
      }

      // If no default, try to find any active OAuth provider
      const oauthProvider = providers.find(p => p.authType === 'oauth' && p.isActive);
      if (oauthProvider) {
        return oauthProvider as AiProvider;
      }

      // No fallback to environment variables - must use database providers
      return null;
    } catch (error) {
      console.error('Failed to get default provider:', error);
      return null;
    }
  }

  /**
   * Create an AI SDK client for a provider with OAuth support
   */
  static async createClient(provider: AiProvider) {
    // Validate provider type at runtime
    const validTypes: AIProviderType[] = ['openai', 'anthropic', 'groq', 'ollama', 'deepinfra'];
    if (!validTypes.includes(provider.type as AIProviderType)) {
      throw new Error(`Invalid provider type: ${provider.type}`);
    }

    // Safely handle settings with proper type checking
    const settings = provider.settings as unknown;

    // Parse settings with proper typing and defaults
    let parsedSettings: ProviderSettings = {
      timeout: 30000,
      maxRetries: 3,
    };

    if (typeof settings === 'object' && settings !== null) {
      const settingsObj = settings as Record<string, unknown>;

      if (settingsObj.baseUrl && typeof settingsObj.baseUrl === 'string') {
        parsedSettings.baseUrl = settingsObj.baseUrl;
      }
      if (settingsObj.organization && typeof settingsObj.organization === 'string') {
        parsedSettings.organization = settingsObj.organization;
      }
      if (settingsObj.defaultModel && typeof settingsObj.defaultModel === 'string') {
        parsedSettings.defaultModel = settingsObj.defaultModel;
      }
      if (settingsObj.timeout && typeof settingsObj.timeout === 'number') {
        parsedSettings.timeout = settingsObj.timeout;
      }
      if (settingsObj.maxRetries && typeof settingsObj.maxRetries === 'number') {
        parsedSettings.maxRetries = settingsObj.maxRetries;
      }
    }

    // Override baseUrl if provided in provider configuration
    if (provider.baseUrl) {
      parsedSettings = { ...parsedSettings, baseUrl: provider.baseUrl };
    }

    const providerConfig = {
      id: provider.id,
      name: provider.name,
      type: provider.type as AIProviderType,
      authType: provider.authType,
      // For OAuth providers, client creation will fetch/refresh token as needed
      apiKey: provider.authType === 'api_key' ? provider.apiKey : undefined,
      // Include API key as fallback for OAuth providers
      fallbackApiKey: provider.apiKey,
      settings: parsedSettings,
    };

    return ProviderFactory.createProviderWithRefresh(providerConfig);
  }

  /**
   * Test provider connectivity with OAuth token refresh
   */
  static async testProvider(provider: AiProvider): Promise<{ success: boolean; error?: string }> {
    try {
      // For Ollama providers, test connectivity directly
      if (provider.type === 'ollama') {
        const ollamaClient = new OllamaClient(provider.baseUrl || 'http://localhost:11434');
        return await ollamaClient.testConnection();
      }

      // For OAuth providers, validate token status first
      if (provider.authType === 'oauth') {
        try {
          const hasValidTokens = await TokenManager.hasValidTokens(provider.id);
          if (!hasValidTokens) {
            return {
              success: false,
              error: 'OAuth tokens are invalid or expired. Please re-authenticate.',
            };
          }
        } catch (error) {
          return {
            success: false,
            error: `OAuth token validation failed: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      }

      const client = await this.createClient(provider);

      // For now, just test that we can create the client
      // In a full implementation, you might make a simple API call to test connectivity
      if (!client) {
        return { success: false, error: 'Failed to create client' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get provider with fresh OAuth tokens if needed
   */
  static async getProviderWithFreshTokens(providerId: string): Promise<AiProvider | null> {
    try {
      // This would typically fetch from database
      // For now, we'll use the ProviderService to retrieve the provider model
      const { ProviderService } = await import('../services/provider-service');
      const providerModel = await ProviderService.getProvider(providerId);

      if (!providerModel) {
        return null;
      }

      return TokenManager.toAiProviderInterface(providerModel);
    } catch (error) {
      console.error('Failed to get provider with fresh tokens:', error);
      return null;
    }
  }

  /**
   * Get or create a default provider for emergency fallback
   */
  static async ensureDefaultProvider(): Promise<AiProvider> {
    const provider = await this.getDefaultProvider();

    if (provider) {
      return provider;
    }

    // If no provider exists, throw an error - the system is not configured
    throw new Error(
      'No AI provider configured. Please set up providers in the database or configure environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY).'
    );
  }

  /**
   * Discover available models from an Ollama provider
   */
  static async discoverOllamaModels(baseUrl?: string): Promise<string[]> {
    try {
      const ollamaClient = new OllamaClient(baseUrl || 'http://localhost:11434');
      return await ollamaClient.discoverModels();
    } catch (error) {
      logger.warn('Failed to discover Ollama models:', error);
      return [];
    }
  }

  /**
   * Get detailed model information from Ollama
   */
  static async getOllamaModelDetails(baseUrl?: string) {
    try {
      const ollamaClient = new OllamaClient(baseUrl || 'http://localhost:11434');
      return await ollamaClient.getModelDetails();
    } catch (error) {
      logger.warn('Failed to get Ollama model details:', error);
      return [];
    }
  }

  /**
   * Resolve Ollama default model by preferring a running model (/api/ps),
   * otherwise the first configured DB model, else static fallback.
   */
  static async getOllamaDefaultModel(provider: AiProvider): Promise<string> {
    try {
      const base = provider.baseUrl || 'http://localhost:11434';
      const running = await getOllamaRunningModels(base);
      logger.debug('Ollama default resolution', {
        base,
        runningCount: running.length,
        runningFirst: running[0],
        hasDbModels: Array.isArray(provider.models),
        dbFirstType: Array.isArray(provider.models)
          ? typeof (provider.models as any[])[0]
          : undefined,
        dbFirstValue: Array.isArray(provider.models) ? (provider.models as any[])[0] : undefined,
      });
      if (running.length > 0) {
        logger.debug('Ollama default selection: running model', { selected: running[0] });
        return running[0];
      }
    } catch (e) {
      logger.debug('Ollama /api/ps check failed; falling back to DB/static', {
        error: e instanceof Error ? e.message : String(e),
      });
      // ignore and fall through to DB-configured models
    }

    if (Array.isArray(provider.models) && provider.models.length > 0) {
      const first = (provider.models as any[])[0] as unknown;
      const candidate =
        typeof first === 'string'
          ? (first as string)
          : first && typeof (first as any).name === 'string'
            ? (first as any).name
            : first && typeof (first as any).id === 'string'
              ? (first as any).id
              : undefined;
      if (candidate) {
        logger.debug('Ollama default selection: DB model', { selected: candidate });
        return candidate;
      }
    }

    const fallback = ProviderFactory.getDefaultModel('ollama');
    logger.debug('Ollama default selection: static fallback', { selected: fallback });
    return fallback;
  }

  /**
   * Refresh provider cache (for future optimization)
   */
  static clearCache(): void {
    this.providerCache.clear();
  }
}
