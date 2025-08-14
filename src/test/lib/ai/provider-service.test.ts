import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderService } from '../../../lib/ai/provider-service';
import { ProviderManager } from '../../../lib/ai/provider-manager';
import { TokenManager } from '../../../lib/auth/token-manager';
import { AiProvider as AiProviderModel } from '../../../lib/db/models/AiProvider';

// Mock dependencies
vi.mock('../../../lib/ai/provider-manager');
vi.mock('../../../lib/auth/token-manager');
vi.mock('../../../lib/db/models/AiProvider');

describe('ProviderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockProviderModel = {
    id: 'test-provider-id',
    name: 'Test Provider',
    type: 'anthropic',
    authType: 'oauth',
    isActive: true,
    isDefault: true,
    apiKey: 'backup-api-key',
    oauthAccessToken: 'oauth-token',
    oauthRefreshToken: 'refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiProvider = {
    id: 'test-provider-id',
    name: 'Test Provider',
    type: 'anthropic',
    authType: 'oauth' as const,
    isActive: true,
    isDefault: true,
    apiKey: 'backup-api-key',
    baseUrl: null,
    models: [],
    settings: {},
    oauthAccessToken: 'oauth-token',
    oauthRefreshToken: 'refresh-token',
    oauthTokenExpiresAt: new Date(),
    oauthScope: 'read write',
    oauthClientId: 'client-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getActiveProviders', () => {
    it('should return active providers with fresh tokens', async () => {
      vi.mocked(AiProviderModel.findAll).mockResolvedValue([
        mockProviderModel,
      ] as AiProviderModel[]);
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(mockAiProvider);

      const providers = await ProviderService.getActiveProviders();

      expect(providers).toHaveLength(1);
      expect(providers[0]).toEqual(mockAiProvider);
      expect(AiProviderModel.findAll).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should skip providers with invalid configurations', async () => {
      vi.mocked(AiProviderModel.findAll).mockResolvedValue([
        mockProviderModel,
      ] as AiProviderModel[]);
      vi.mocked(TokenManager.toAiProviderInterface).mockRejectedValue(
        new Error('Invalid configuration')
      );

      const providers = await ProviderService.getActiveProviders();

      expect(providers).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(AiProviderModel.findAll).mockRejectedValue(new Error('Database error'));

      const providers = await ProviderService.getActiveProviders();

      expect(providers).toHaveLength(0);
    });
  });

  describe('getDefaultProvider', () => {
    it('should return default provider', async () => {
      vi.mocked(AiProviderModel.findOne).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(mockAiProvider);

      const provider = await ProviderService.getDefaultProvider();

      expect(provider).toEqual(mockAiProvider);
      expect(AiProviderModel.findOne).toHaveBeenCalledWith({
        where: { isDefault: true, isActive: true },
      });
    });

    it('should fallback to first active provider when no default', async () => {
      vi.mocked(AiProviderModel.findOne)
        .mockResolvedValueOnce(null) // No default provider
        .mockResolvedValueOnce(mockProviderModel as AiProviderModel); // First active provider
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(mockAiProvider);

      const provider = await ProviderService.getDefaultProvider();

      expect(provider).toEqual(mockAiProvider);
      expect(AiProviderModel.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null when no providers available', async () => {
      vi.mocked(AiProviderModel.findOne).mockResolvedValue(null);

      const provider = await ProviderService.getDefaultProvider();

      expect(provider).toBeNull();
    });
  });

  describe('createProviderClient', () => {
    it('should create client for active provider', async () => {
      const mockClient = { generate: vi.fn() };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(mockAiProvider);
      vi.mocked(ProviderManager.createClient).mockResolvedValue(mockClient as any);

      const client = await ProviderService.createProviderClient('test-provider-id');

      expect(client).toBe(mockClient);
      expect(ProviderManager.createClient).toHaveBeenCalledWith(mockAiProvider);
    });

    it('should throw error for non-existent provider', async () => {
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(null);

      await expect(ProviderService.createProviderClient('non-existent')).rejects.toThrow(
        'Provider not found: non-existent'
      );
    });

    it('should throw error for inactive provider', async () => {
      const inactiveProvider = { ...mockAiProvider, isActive: false };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(inactiveProvider);

      await expect(ProviderService.createProviderClient('test-provider-id')).rejects.toThrow(
        'Provider is not active: Test Provider'
      );
    });
  });

  describe('testProviderConnectivity', () => {
    it('should test OAuth provider with token status', async () => {
      const tokenStatus = {
        isExpired: false,
        canRefresh: true,
        minutesUntilExpiry: 30,
      };

      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(mockAiProvider);
      vi.mocked(TokenManager.getTokenStatus).mockResolvedValue(tokenStatus);
      vi.mocked(ProviderManager.testProvider).mockResolvedValue({ success: true });

      const result = await ProviderService.testProviderConnectivity('test-provider-id');

      expect(result).toEqual({
        success: true,
        tokenStatus,
      });
    });

    it('should handle token status check failure', async () => {
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(mockAiProvider);
      vi.mocked(TokenManager.getTokenStatus).mockRejectedValue(new Error('Token check failed'));

      const result = await ProviderService.testProviderConnectivity('test-provider-id');

      expect(result).toEqual({
        success: false,
        error: 'Failed to check OAuth token status: Token check failed',
      });
    });

    it('should test API key provider without token status', async () => {
      const apiKeyProvider = { ...mockAiProvider, authType: 'api_key' as const };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.toAiProviderInterface).mockResolvedValue(apiKeyProvider);
      vi.mocked(ProviderManager.testProvider).mockResolvedValue({ success: true });

      const result = await ProviderService.testProviderConnectivity('test-provider-id');

      expect(result).toEqual({
        success: true,
        tokenStatus: undefined,
      });
      expect(TokenManager.getTokenStatus).not.toHaveBeenCalled();
    });
  });

  describe('refreshProviderTokens', () => {
    it('should refresh OAuth provider tokens', async () => {
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.getValidToken).mockResolvedValue('new-token');

      const result = await ProviderService.refreshProviderTokens('test-provider-id');

      expect(result).toEqual({ success: true });
      expect(TokenManager.getValidToken).toHaveBeenCalledWith('test-provider-id');
    });

    it('should handle non-OAuth provider', async () => {
      const apiKeyProvider = { ...mockProviderModel, authType: 'api_key' };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(apiKeyProvider as AiProviderModel);

      const result = await ProviderService.refreshProviderTokens('test-provider-id');

      expect(result).toEqual({
        success: false,
        error: 'Provider is not configured for OAuth authentication',
      });
    });

    it('should handle token refresh failure', async () => {
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.getValidToken).mockRejectedValue(new Error('Refresh failed'));

      const result = await ProviderService.refreshProviderTokens('test-provider-id');

      expect(result).toEqual({
        success: false,
        error: 'Refresh failed',
      });
    });
  });

  describe('handleOAuthError', () => {
    it('should indicate API key fallback is available', async () => {
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);

      const result = await ProviderService.handleOAuthError(
        'test-provider-id',
        new Error('OAuth failed')
      );

      expect(result).toEqual({
        canFallback: true,
        fallbackStrategy: 'api_key',
      });
    });

    it('should indicate token refresh is available', async () => {
      const providerWithoutApiKey = { ...mockProviderModel, apiKey: null };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(
        providerWithoutApiKey as unknown as AiProviderModel
      );
      vi.mocked(TokenManager.getValidToken).mockResolvedValue('refreshed-token');

      const result = await ProviderService.handleOAuthError(
        'test-provider-id',
        new Error('OAuth failed')
      );

      expect(result).toEqual({
        canFallback: true,
        fallbackStrategy: 'token_refresh',
      });
    });

    it('should indicate re-authentication is required', async () => {
      const providerWithoutFallback = {
        ...mockProviderModel,
        apiKey: null,
        oauthRefreshToken: null,
      };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(
        providerWithoutFallback as unknown as AiProviderModel
      );

      const result = await ProviderService.handleOAuthError(
        'test-provider-id',
        new Error('OAuth failed')
      );

      expect(result).toEqual({
        canFallback: false,
        requiresReauth: true,
      });
    });
  });

  describe('getProviderAuthStatus', () => {
    it('should return valid status for API key provider', async () => {
      const apiKeyProvider = { ...mockProviderModel, authType: 'api_key', apiKey: 'valid-key' };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(apiKeyProvider as AiProviderModel);

      const result = await ProviderService.getProviderAuthStatus('test-provider-id');

      expect(result).toEqual({
        isValid: true,
        authType: 'api_key',
      });
    });

    it('should return invalid status for API key provider without key', async () => {
      const apiKeyProvider = { ...mockProviderModel, authType: 'api_key', apiKey: null };
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(
        apiKeyProvider as unknown as AiProviderModel
      );

      const result = await ProviderService.getProviderAuthStatus('test-provider-id');

      expect(result).toEqual({
        isValid: false,
        authType: 'api_key',
        error: 'Missing API key',
      });
    });

    it('should return OAuth status with token information', async () => {
      const tokenStatus = {
        isExpired: false,
        canRefresh: true,
        expiresAt: new Date(),
        minutesUntilExpiry: 30,
      };

      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(mockProviderModel as AiProviderModel);
      vi.mocked(TokenManager.getTokenStatus).mockResolvedValue(tokenStatus);
      vi.mocked(TokenManager.hasValidTokens).mockResolvedValue(true);

      const result = await ProviderService.getProviderAuthStatus('test-provider-id');

      expect(result).toEqual({
        isValid: true,
        authType: 'oauth',
        tokenStatus,
      });
    });

    it('should handle provider not found', async () => {
      vi.mocked(AiProviderModel.findByPk).mockResolvedValue(null);

      const result = await ProviderService.getProviderAuthStatus('non-existent');

      expect(result).toEqual({
        isValid: false,
        authType: 'api_key',
        error: 'Provider not found',
      });
    });
  });
});
