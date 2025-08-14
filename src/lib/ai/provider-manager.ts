import { ProviderFactory } from './provider-factory';
import { TokenManager } from '../auth/token-manager';
import { env } from '../env';
import type {
  AIProviderType,
  ProviderSettings,
  ModelConfig,
  EnhancedProviderConfig,
} from './types';

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
   * Get the default provider for handling requests
   */
  static async getDefaultProvider(): Promise<AiProvider | null> {
    try {
      // Check environment variable for default provider
      if (env.DEFAULT_AI_PROVIDER) {
        const envProvider = await this.getProviderByType(env.DEFAULT_AI_PROVIDER);
        if (envProvider) {
          return envProvider;
        }
      }

      // Fall back to creating a provider from available environment variables
      return this.createFallbackProvider();
    } catch (error) {
      console.error('Failed to get default provider:', error, {
        envProvider: env.DEFAULT_AI_PROVIDER,
        hasOpenAI: !!env.OPENAI_API_KEY,
        hasAnthropic: !!env.ANTHROPIC_API_KEY,
        hasGroq: !!env.GROQ_API_KEY,
      });
      return this.createFallbackProvider();
    }
  }

  /**
   * Get a provider by type from environment
   */
  static async getProviderByType(type: AIProviderType): Promise<AiProvider | null> {
    try {
      // Create from environment if available
      return this.createProviderFromEnv(type);
    } catch (error) {
      console.error(`Failed to get provider for type ${type}:`, error, {
        attemptedType: type,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return null;
    }
  }

  /**
   * Create a provider configuration from environment variables
   */
  private static createProviderFromEnv(type: AIProviderType): AiProvider | null {
    let apiKey: string | undefined;
    let baseUrl: string | undefined;

    switch (type) {
      case 'openai':
        apiKey = env.OPENAI_API_KEY;
        break;
      case 'anthropic':
        apiKey = env.ANTHROPIC_API_KEY;
        break;
      case 'groq':
        apiKey = env.GROQ_API_KEY;
        baseUrl = 'https://api.groq.com/openai/v1';
        break;
    }

    if (!apiKey) {
      return null;
    }

    // Create an in-memory provider configuration
    // Note: API key is kept in memory only for immediate use and not logged
    return {
      id: `env-${type}`,
      name: `Environment ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      authType: 'api_key' as const,
      apiKey, // This is used immediately by createClient and not stored/logged
      baseUrl: baseUrl || null,
      models: null,
      settings: null,
      isActive: true,
      isDefault: env.DEFAULT_AI_PROVIDER === type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create a fallback provider when no configuration is available
   */
  private static createFallbackProvider(): AiProvider | null {
    // Try each provider type in order of preference
    const preferredOrder: AIProviderType[] = ['anthropic', 'openai', 'groq'];

    for (const type of preferredOrder) {
      const provider = this.createProviderFromEnv(type);
      if (provider) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Get all active providers from environment variables
   */
  static async getActiveProviders(): Promise<AiProvider[]> {
    try {
      const providers: AiProvider[] = [];
      const providerTypes: AIProviderType[] = ['anthropic', 'openai', 'groq'];

      for (const type of providerTypes) {
        const provider = this.createProviderFromEnv(type);
        if (provider) {
          providers.push(provider);
        }
      }

      return providers;
    } catch (error) {
      console.error('Failed to get active providers:', error);
      return [];
    }
  }

  /**
   * Create an AI SDK client for a provider with OAuth support
   */
  static async createClient(provider: AiProvider) {
    // Validate provider type at runtime
    const validTypes: AIProviderType[] = ['openai', 'anthropic', 'groq'];
    if (!validTypes.includes(provider.type as AIProviderType)) {
      throw new Error(`Invalid provider type: ${provider.type}`);
    }

    // Safely handle models and settings with proper type checking
    const models = provider.models as unknown;
    const settings = provider.settings as unknown;

    // Parse models with proper typing
    let parsedModels: ModelConfig[] = [];
    if (Array.isArray(models)) {
      parsedModels = models as ModelConfig[];
    }

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

    const providerConfig: EnhancedProviderConfig = {
      id: provider.id,
      name: provider.name,
      type: provider.type as AIProviderType, // Safe after validation above
      authType: provider.authType,
      // For OAuth providers, we'll let ProviderFactory handle token refresh
      apiKey: provider.authType === 'api_key' ? provider.apiKey : undefined,
      // OAuth fields
      oauthAccessToken: provider.oauthAccessToken,
      oauthRefreshToken: provider.oauthRefreshToken,
      oauthTokenExpiresAt: provider.oauthTokenExpiresAt,
      oauthScope: provider.oauthScope,
      oauthClientId: provider.oauthClientId,
      // Include API key as fallback for OAuth providers
      fallbackApiKey: provider.apiKey,
      models: parsedModels,
      settings: parsedSettings,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };

    return ProviderFactory.createProviderWithRefresh(providerConfig);
  }

  /**
   * Test provider connectivity with OAuth token refresh
   */
  static async testProvider(provider: AiProvider): Promise<{ success: boolean; error?: string }> {
    try {
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
      // For now, we'll use the TokenManager's interface conversion
      const { AiProvider: AiProviderModel } = await import('../db/models/AiProvider');
      const providerModel = await AiProviderModel.findByPk(providerId);

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
   * Refresh provider cache (for future optimization)
   */
  static clearCache(): void {
    this.providerCache.clear();
  }
}
