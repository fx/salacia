import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderFactory } from '../../../lib/ai/provider-factory';
import { TokenManager } from '../../../lib/auth/token-manager';
import type { EnhancedProviderConfig } from '../../../lib/ai/types';

// Mock the TokenManager
vi.mock('../../../lib/auth/token-manager');

describe('ProviderFactory OAuth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOAuthConfig: EnhancedProviderConfig = {
    id: 'test-oauth-provider',
    name: 'Test OAuth Provider',
    type: 'anthropic',
    authType: 'oauth',
    oauthAccessToken: 'oauth-token-123',
    oauthRefreshToken: 'refresh-token-123',
    oauthTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    oauthScope: 'read write',
    oauthClientId: 'client-123',
    models: [],
    settings: {
      timeout: 30000,
      maxRetries: 3,
    },
    isActive: true,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApiKeyConfig: EnhancedProviderConfig = {
    id: 'test-api-key-provider',
    name: 'Test API Key Provider',
    type: 'anthropic',
    authType: 'api_key',
    apiKey: 'api-key-123',
    models: [],
    settings: {
      timeout: 30000,
      maxRetries: 3,
    },
    isActive: true,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getAuthenticationCredentials', () => {
    it('should get OAuth token for OAuth provider', async () => {
      const mockToken = 'fresh-oauth-token';
      vi.mocked(TokenManager.getValidToken).mockResolvedValue(mockToken);

      const result = await ProviderFactory.getAuthenticationCredentials(mockOAuthConfig);

      expect(result).toBe(mockToken);
      expect(TokenManager.getValidToken).toHaveBeenCalledWith(mockOAuthConfig.id);
    });

    it('should fallback to API key when OAuth fails', async () => {
      const configWithFallback = {
        ...mockOAuthConfig,
        fallbackApiKey: 'fallback-key-123',
      };

      vi.mocked(TokenManager.getValidToken).mockRejectedValue(new Error('OAuth failed'));

      const result = await ProviderFactory.getAuthenticationCredentials(configWithFallback);

      expect(result).toBe('fallback-key-123');
      expect(TokenManager.getValidToken).toHaveBeenCalledWith(mockOAuthConfig.id);
    });

    it('should use apiKey as fallback when OAuth fails and no explicit fallback', async () => {
      const configWithApiKey = {
        ...mockOAuthConfig,
        apiKey: 'backup-api-key',
      };

      vi.mocked(TokenManager.getValidToken).mockRejectedValue(new Error('OAuth failed'));

      const result = await ProviderFactory.getAuthenticationCredentials(configWithApiKey);

      expect(result).toBe('backup-api-key');
    });

    it('should throw error when OAuth fails and no fallback available', async () => {
      vi.mocked(TokenManager.getValidToken).mockRejectedValue(new Error('Token expired'));

      await expect(ProviderFactory.getAuthenticationCredentials(mockOAuthConfig)).rejects.toThrow(
        'OAuth authentication failed and no fallback API key available for provider Test OAuth Provider'
      );
    });

    it('should return API key for API key provider', async () => {
      const result = await ProviderFactory.getAuthenticationCredentials(mockApiKeyConfig);

      expect(result).toBe('api-key-123');
      expect(TokenManager.getValidToken).not.toHaveBeenCalled();
    });

    it('should throw error when API key provider missing key', async () => {
      const configWithoutKey = {
        ...mockApiKeyConfig,
        apiKey: undefined,
      };

      await expect(ProviderFactory.getAuthenticationCredentials(configWithoutKey)).rejects.toThrow(
        'Missing API key for provider Test API Key Provider'
      );
    });

    it('should throw error for unsupported auth type', async () => {
      const invalidConfig = {
        ...mockApiKeyConfig,
        authType: 'invalid' as 'api_key',
      };

      await expect(ProviderFactory.getAuthenticationCredentials(invalidConfig)).rejects.toThrow(
        'Unsupported authentication type: invalid'
      );
    });
  });

  describe('hasValidAuthentication', () => {
    it('should return true when authentication is valid', async () => {
      vi.mocked(TokenManager.getValidToken).mockResolvedValue('valid-token');

      const result = await ProviderFactory.hasValidAuthentication(mockOAuthConfig);

      expect(result).toBe(true);
    });

    it('should return false when authentication fails', async () => {
      vi.mocked(TokenManager.getValidToken).mockRejectedValue(new Error('Auth failed'));

      const result = await ProviderFactory.hasValidAuthentication(mockOAuthConfig);

      expect(result).toBe(false);
    });
  });

  describe('createProvider', () => {
    it('should create Anthropic provider with OAuth token', async () => {
      const mockToken = 'oauth-token-123';
      vi.mocked(TokenManager.getValidToken).mockResolvedValue(mockToken);

      const provider = await ProviderFactory.createProvider(mockOAuthConfig);

      expect(provider).toBeDefined();
      expect(TokenManager.getValidToken).toHaveBeenCalledWith(mockOAuthConfig.id);
    });

    it('should create OpenAI provider with API key', async () => {
      const openAIConfig = {
        ...mockApiKeyConfig,
        type: 'openai' as const,
      };

      const provider = await ProviderFactory.createProvider(openAIConfig);

      expect(provider).toBeDefined();
      expect(TokenManager.getValidToken).not.toHaveBeenCalled();
    });

    it('should create Groq provider with OAuth fallback to API key', async () => {
      const groqConfig = {
        ...mockOAuthConfig,
        type: 'groq' as const,
        fallbackApiKey: 'groq-api-key',
      };

      vi.mocked(TokenManager.getValidToken).mockRejectedValue(new Error('OAuth failed'));

      const provider = await ProviderFactory.createProvider(groqConfig);

      expect(provider).toBeDefined();
      expect(TokenManager.getValidToken).toHaveBeenCalledWith(groqConfig.id);
    });

    it('should throw error for invalid provider type', async () => {
      const invalidConfig = {
        ...mockApiKeyConfig,
        type: 'invalid' as 'anthropic',
      };

      await expect(ProviderFactory.createProvider(invalidConfig)).rejects.toThrow(
        'Unsupported provider type: invalid'
      );
    });
  });

  describe('createProviderWithRefresh', () => {
    it('should validate OAuth token before creating provider', async () => {
      const mockToken = 'refreshed-token';
      vi.mocked(TokenManager.getValidToken).mockResolvedValue(mockToken);

      const provider = await ProviderFactory.createProviderWithRefresh(mockOAuthConfig);

      expect(provider).toBeDefined();
      expect(TokenManager.getValidToken).toHaveBeenCalledTimes(2); // Once for validation, once for creation
    });

    it('should continue with creation even if token validation fails', async () => {
      vi.mocked(TokenManager.getValidToken)
        .mockRejectedValueOnce(new Error('Validation failed'))
        .mockResolvedValueOnce('fallback-token');

      const configWithFallback = {
        ...mockOAuthConfig,
        fallbackApiKey: 'fallback-key',
      };

      const provider = await ProviderFactory.createProviderWithRefresh(configWithFallback);

      expect(provider).toBeDefined();
    });

    it('should work normally for API key providers', async () => {
      const provider = await ProviderFactory.createProviderWithRefresh(mockApiKeyConfig);

      expect(provider).toBeDefined();
      expect(TokenManager.getValidToken).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle token refresh during provider creation', async () => {
      const expiredConfig = {
        ...mockOAuthConfig,
        oauthTokenExpiresAt: new Date(Date.now() - 1000), // Already expired
      };

      vi.mocked(TokenManager.getValidToken).mockResolvedValue('refreshed-token');

      const provider = await ProviderFactory.createProvider(expiredConfig);

      expect(provider).toBeDefined();
      expect(TokenManager.getValidToken).toHaveBeenCalledWith(expiredConfig.id);
    });

    it('should handle dual authentication setup (OAuth + API key)', async () => {
      const dualConfig = {
        ...mockOAuthConfig,
        apiKey: 'backup-api-key',
      };

      // First call fails (OAuth), second call succeeds (fallback)
      vi.mocked(TokenManager.getValidToken).mockRejectedValue(
        new Error('OAuth service unavailable')
      );

      const provider = await ProviderFactory.createProvider(dualConfig);

      expect(provider).toBeDefined();
      expect(TokenManager.getValidToken).toHaveBeenCalledWith(dualConfig.id);
    });

    it('should provide helpful error messages for missing configuration', async () => {
      const incompleteConfig = {
        ...mockOAuthConfig,
        id: undefined as any,
      };

      await expect(ProviderFactory.createProvider(incompleteConfig)).rejects.toThrow(
        'Provider ID required for OAuth authentication'
      );
    });
  });
});
