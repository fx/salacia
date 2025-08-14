import { AiProvider as AiProviderModel } from '../db/models/AiProvider';
import { OAuthService, type OAuthTokenResponse } from './oauth-service';
import type { AiProvider } from '../ai/provider-manager';

/**
 * Token manager for handling OAuth tokens in the database
 * Provides secure storage and automatic refresh of OAuth tokens
 */
export class TokenManager {
  /**
   * Store OAuth token data in provider record
   */
  static async storeTokenData(
    providerId: string,
    tokenResponse: OAuthTokenResponse,
    clientId: string,
    scope?: string
  ): Promise<AiProviderModel> {
    const provider = await AiProviderModel.findByPk(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const expiresAt = OAuthService.calculateExpirationDate(tokenResponse.expires_in);

    await provider.update({
      authType: 'oauth',
      oauthAccessToken: tokenResponse.access_token,
      oauthRefreshToken: tokenResponse.refresh_token,
      oauthTokenExpiresAt: expiresAt,
      oauthScope: scope || tokenResponse.scope,
      oauthClientId: clientId,
      // Preserve existing API key as fallback when switching to OAuth
      // apiKey remains unchanged to allow fallback authentication
    });

    return provider.reload();
  }

  /**
   * Get OAuth token for a provider, refreshing if necessary
   */
  static async getValidToken(providerId: string): Promise<string> {
    const provider = await AiProviderModel.findByPk(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.authType !== 'oauth') {
      throw new Error('Provider is not configured for OAuth authentication');
    }

    if (!provider.oauthAccessToken) {
      throw new Error('No OAuth access token found');
    }

    // Check if token needs refresh
    if (provider.oauthTokenExpiresAt && OAuthService.isTokenExpired(provider.oauthTokenExpiresAt)) {
      if (!provider.oauthRefreshToken) {
        throw new Error('OAuth access token expired and no refresh token available');
      }

      try {
        const refreshedToken = await OAuthService.refreshToken(provider.oauthRefreshToken, {
          clientId: provider.oauthClientId || undefined,
        });

        await this.storeTokenData(
          providerId,
          refreshedToken,
          provider.oauthClientId || '',
          provider.oauthScope || undefined
        );

        return refreshedToken.access_token;
      } catch (error) {
        throw new Error(
          `Failed to refresh OAuth token: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return provider.oauthAccessToken;
  }

  /**
   * Revoke OAuth tokens and clear them from database
   */
  static async revokeTokens(providerId: string): Promise<void> {
    const provider = await AiProviderModel.findByPk(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.authType !== 'oauth') {
      return; // Nothing to revoke
    }

    // Revoke tokens with OAuth provider
    const clientId = provider.oauthClientId;
    if (provider.oauthAccessToken && clientId) {
      try {
        await OAuthService.revokeToken(provider.oauthAccessToken, 'access_token', { clientId });
      } catch (error) {
        console.warn('Failed to revoke access token:', error);
      }
    }

    if (provider.oauthRefreshToken && clientId) {
      try {
        await OAuthService.revokeToken(provider.oauthRefreshToken, 'refresh_token', { clientId });
      } catch (error) {
        console.warn('Failed to revoke refresh token:', error);
      }
    }

    // Clear tokens from database
    await provider.update({
      oauthAccessToken: undefined,
      oauthRefreshToken: undefined,
      oauthTokenExpiresAt: undefined,
      oauthScope: undefined,
      oauthClientId: undefined,
    });
  }

  /**
   * Check if provider has valid OAuth tokens
   */
  static async hasValidTokens(providerId: string): Promise<boolean> {
    const provider = await AiProviderModel.findByPk(providerId);
    if (!provider || provider.authType !== 'oauth') {
      return false;
    }

    if (!provider.oauthAccessToken) {
      return false;
    }

    // Check if token is expired
    if (provider.oauthTokenExpiresAt) {
      if (OAuthService.isTokenExpired(provider.oauthTokenExpiresAt)) {
        // Check if we can refresh
        return !!provider.oauthRefreshToken;
      }
    }

    return true;
  }

  /**
   * Convert database provider to AiProvider interface with OAuth token as apiKey
   */
  static async toAiProviderInterface(provider: AiProviderModel): Promise<AiProvider> {
    let apiKey = provider.apiKey;

    // For OAuth providers, use the access token as the apiKey
    if (provider.authType === 'oauth' && provider.oauthAccessToken) {
      try {
        apiKey = await this.getValidToken(provider.id);
      } catch (error) {
        console.warn('Failed to get valid OAuth token:', error);
        apiKey = provider.oauthAccessToken; // Fall back to stored token
      }
    }

    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      authType: provider.authType,
      apiKey,
      baseUrl: provider.baseUrl || null,
      models: provider.models,
      settings: provider.settings,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      oauthAccessToken: provider.oauthAccessToken,
      oauthRefreshToken: provider.oauthRefreshToken,
      oauthTokenExpiresAt: provider.oauthTokenExpiresAt,
      oauthScope: provider.oauthScope,
      oauthClientId: provider.oauthClientId,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  /**
   * Get token expiration status for a provider
   */
  static async getTokenStatus(providerId: string): Promise<{
    isExpired: boolean;
    expiresAt?: Date;
    canRefresh: boolean;
    minutesUntilExpiry?: number;
  }> {
    const provider = await AiProviderModel.findByPk(providerId);
    if (!provider || provider.authType !== 'oauth') {
      return { isExpired: true, canRefresh: false };
    }

    if (!provider.oauthTokenExpiresAt) {
      return { isExpired: false, canRefresh: !!provider.oauthRefreshToken };
    }

    const isExpired = OAuthService.isTokenExpired(provider.oauthTokenExpiresAt);
    const minutesUntilExpiry = Math.max(
      0,
      Math.floor((provider.oauthTokenExpiresAt.getTime() - Date.now()) / (1000 * 60))
    );

    return {
      isExpired,
      expiresAt: provider.oauthTokenExpiresAt,
      canRefresh: !!provider.oauthRefreshToken,
      minutesUntilExpiry,
    };
  }
}
