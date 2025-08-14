import { ProviderManager, type AiProvider } from './provider-manager';
import { TokenManager } from '../auth/token-manager';
import { AiProvider as AiProviderModel } from '../db/models/AiProvider';

/**
 * Provider service for managing AI providers with OAuth support
 * Handles database operations, token management, and provider lifecycle
 */
export class ProviderService {
  /**
   * Get all active providers with fresh OAuth tokens
   */
  static async getActiveProviders(): Promise<AiProvider[]> {
    try {
      const providers = await AiProviderModel.findAll({
        where: { isActive: true },
      });

      const activeProviders: AiProvider[] = [];

      for (const provider of providers) {
        try {
          const aiProvider = await TokenManager.toAiProviderInterface(provider);
          activeProviders.push(aiProvider);
        } catch (error) {
          console.warn(`Failed to convert provider ${provider.name} to interface:`, error);
          // Skip providers with invalid configurations
        }
      }

      return activeProviders;
    } catch (error) {
      console.error('Failed to get active providers:', error);
      return [];
    }
  }

  /**
   * Get default provider with fresh OAuth tokens
   */
  static async getDefaultProvider(): Promise<AiProvider | null> {
    try {
      const provider = await AiProviderModel.findOne({
        where: { isDefault: true, isActive: true },
      });

      if (!provider) {
        // Fallback to any active provider
        const firstActive = await AiProviderModel.findOne({
          where: { isActive: true },
        });

        if (!firstActive) {
          return null;
        }

        return TokenManager.toAiProviderInterface(firstActive);
      }

      return TokenManager.toAiProviderInterface(provider);
    } catch (error) {
      console.error('Failed to get default provider:', error);
      return null;
    }
  }

  /**
   * Get provider by ID with fresh OAuth tokens
   */
  static async getProviderById(id: string): Promise<AiProvider | null> {
    try {
      const provider = await AiProviderModel.findByPk(id);

      if (!provider) {
        return null;
      }

      return TokenManager.toAiProviderInterface(provider);
    } catch (error) {
      console.error(`Failed to get provider ${id}:`, error);
      return null;
    }
  }

  /**
   * Create AI client for provider with automatic OAuth handling
   */
  static async createProviderClient(providerId: string) {
    const provider = await this.getProviderById(providerId);

    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isActive) {
      throw new Error(`Provider is not active: ${provider.name}`);
    }

    return ProviderManager.createClient(provider);
  }

  /**
   * Test provider connectivity with comprehensive OAuth handling
   */
  static async testProviderConnectivity(providerId: string): Promise<{
    success: boolean;
    error?: string;
    tokenStatus?: {
      isExpired: boolean;
      canRefresh: boolean;
      minutesUntilExpiry?: number;
    };
  }> {
    try {
      const provider = await this.getProviderById(providerId);

      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
        };
      }

      // Get token status for OAuth providers
      let tokenStatus;
      if (provider.authType === 'oauth') {
        try {
          tokenStatus = await TokenManager.getTokenStatus(providerId);
        } catch (error) {
          return {
            success: false,
            error: `Failed to check OAuth token status: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      }

      // Test the provider
      const testResult = await ProviderManager.testProvider(provider);

      return {
        ...testResult,
        tokenStatus,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refresh OAuth tokens for a provider
   */
  static async refreshProviderTokens(providerId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const provider = await AiProviderModel.findByPk(providerId);

      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
        };
      }

      if (provider.authType !== 'oauth') {
        return {
          success: false,
          error: 'Provider is not configured for OAuth authentication',
        };
      }

      // This will trigger token refresh if needed
      await TokenManager.getValidToken(providerId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle OAuth authentication errors with fallback strategies
   */
  static async handleOAuthError(
    providerId: string,
    _error: Error
  ): Promise<{
    canFallback: boolean;
    fallbackStrategy?: string;
    requiresReauth?: boolean;
  }> {
    try {
      const provider = await AiProviderModel.findByPk(providerId);

      if (!provider) {
        return { canFallback: false };
      }

      // Check if we can fallback to API key
      if (provider.apiKey) {
        return {
          canFallback: true,
          fallbackStrategy: 'api_key',
        };
      }

      // Check if we can refresh the token
      if (provider.oauthRefreshToken) {
        try {
          await TokenManager.getValidToken(providerId);
          return {
            canFallback: true,
            fallbackStrategy: 'token_refresh',
          };
        } catch (_refreshError) {
          // Refresh failed, requires re-authentication
          return {
            canFallback: false,
            requiresReauth: true,
          };
        }
      }

      return {
        canFallback: false,
        requiresReauth: true,
      };
    } catch (serviceError) {
      console.error('Failed to handle OAuth error:', serviceError);
      return { canFallback: false };
    }
  }

  /**
   * Get provider authentication status
   */
  static async getProviderAuthStatus(providerId: string): Promise<{
    isValid: boolean;
    authType: 'api_key' | 'oauth';
    tokenStatus?: {
      isExpired: boolean;
      canRefresh: boolean;
      expiresAt?: Date;
      minutesUntilExpiry?: number;
    };
    error?: string;
  }> {
    try {
      const provider = await AiProviderModel.findByPk(providerId);

      if (!provider) {
        return {
          isValid: false,
          authType: 'api_key',
          error: 'Provider not found',
        };
      }

      if (provider.authType === 'api_key') {
        return {
          isValid: !!provider.apiKey,
          authType: 'api_key',
          error: provider.apiKey ? undefined : 'Missing API key',
        };
      }

      // OAuth provider
      const tokenStatus = await TokenManager.getTokenStatus(providerId);
      const hasValidTokens = await TokenManager.hasValidTokens(providerId);

      return {
        isValid: hasValidTokens,
        authType: 'oauth',
        tokenStatus,
        error: hasValidTokens ? undefined : 'Invalid or expired OAuth tokens',
      };
    } catch (error) {
      return {
        isValid: false,
        authType: 'api_key',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
