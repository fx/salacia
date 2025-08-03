import { db } from '../db';
import { aiProviders } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { ProviderFactory } from './provider-factory';
import { env } from '../env';
import type { AiProvider } from '../db/schema';
import type { AIProviderType } from './types';

/**
 * Provider manager for handling AI provider selection and management
 *
 * This service manages the selection of AI providers based on:
 * 1. Database configuration
 * 2. Environment variables
 * 3. Default fallbacks
 */
export class ProviderManager {
  private static providerCache: Map<string, AiProvider> = new Map();
  // Cache functionality can be added later as needed

  /**
   * Get the default provider for handling requests
   */
  static async getDefaultProvider(): Promise<AiProvider | null> {
    try {
      // Try to get from database first
      const dbProvider = await db
        .select()
        .from(aiProviders)
        .where(and(eq(aiProviders.isActive, true), eq(aiProviders.isDefault, true)))
        .limit(1);

      if (dbProvider.length > 0) {
        return dbProvider[0];
      }

      // If no default in database, check environment variable
      if (env.DEFAULT_AI_PROVIDER) {
        const envProvider = await this.getProviderByType(env.DEFAULT_AI_PROVIDER);
        if (envProvider) {
          return envProvider;
        }
      }

      // Fall back to any active provider
      const anyProvider = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.isActive, true))
        .limit(1);

      return anyProvider.length > 0 ? anyProvider[0] : null;
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
   * Get a provider by type from database or create from environment
   */
  static async getProviderByType(type: AIProviderType): Promise<AiProvider | null> {
    try {
      // Check database first
      const dbProvider = await db
        .select()
        .from(aiProviders)
        .where(and(eq(aiProviders.type, type), eq(aiProviders.isActive, true)))
        .limit(1);

      if (dbProvider.length > 0) {
        return dbProvider[0];
      }

      // Create from environment if available
      return this.createProviderFromEnv(type);
    } catch (error) {
      console.error(`Failed to get provider for type ${type}:`, error, {
        attemptedType: type,
        dbError: error instanceof Error ? error.message : 'Unknown',
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
   * Get all active providers from database
   */
  static async getActiveProviders(): Promise<AiProvider[]> {
    try {
      return await db.select().from(aiProviders).where(eq(aiProviders.isActive, true));
    } catch (error) {
      console.error('Failed to get active providers:', error);
      return [];
    }
  }

  /**
   * Create an AI SDK client for a provider
   */
  static createClient(provider: AiProvider) {
    // Validate provider type at runtime
    const validTypes: AIProviderType[] = ['openai', 'anthropic', 'groq'];
    if (!validTypes.includes(provider.type as AIProviderType)) {
      throw new Error(`Invalid provider type: ${provider.type}`);
    }

    // Safely handle models and settings with proper type checking
    const models = provider.models as unknown;
    const settings = provider.settings as unknown;
    
    const providerConfig = {
      id: provider.id,
      name: provider.name,
      type: provider.type as AIProviderType, // Safe after validation above
      apiKey: provider.apiKey,
      models: Array.isArray(models) ? models : [],
      settings: typeof settings === 'object' && settings !== null ? settings : {},
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };

    // Override baseUrl if provided in provider configuration
    if (provider.baseUrl) {
      (providerConfig.settings as Record<string, unknown>).baseUrl = provider.baseUrl;
    }

    return ProviderFactory.createProvider(providerConfig);
  }

  /**
   * Test provider connectivity
   */
  static async testProvider(provider: AiProvider): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.createClient(provider);

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
