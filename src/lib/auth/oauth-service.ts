import { z } from 'zod';
import { env } from '../env';

/**
 * OAuth 2.0 PKCE (Proof Key for Code Exchange) implementation
 * for secure authentication with Claude Max
 */

/**
 * Generate cryptographically secure random string for PKCE
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, byte => charset[byte % charset.length]).join('');
}

/**
 * Generate SHA256 hash and base64url encode
 */
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
  return globalThis
    .btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * PKCE parameters for OAuth flow
 */
export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * OAuth token response from provider
 */
export const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string().optional(),
});
export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;

/**
 * OAuth error response from provider
 */
export const OAuthErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
  error_uri: z.string().optional(),
});
export type OAuthErrorResponse = z.infer<typeof OAuthErrorResponseSchema>;

/**
 * OAuth configuration for Claude Max
 */
export interface ClaudeMaxOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

/**
 * OAuth service for handling Claude Max authentication
 */
export class OAuthService {
  private static readonly DEFAULT_CONFIG: ClaudeMaxOAuthConfig = {
    clientId: env.CLAUDE_MAX_CLIENT_ID || '',
    redirectUri: env.CLAUDE_MAX_REDIRECT_URI || `${env.PUBLIC_APP_URL}/auth/callback`,
    scopes: ['read', 'write'],
    authorizationEndpoint: 'https://claude.ai/oauth/authorize',
    tokenEndpoint: 'https://claude.ai/oauth/token',
  };

  /**
   * Generate PKCE parameters for secure OAuth flow
   */
  static async generatePKCEParams(): Promise<PKCEParams> {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await sha256(codeVerifier);
    const state = generateRandomString(32);

    return {
      codeVerifier,
      codeChallenge,
      state,
    };
  }

  /**
   * Generate authorization URL for Claude Max OAuth
   */
  static generateAuthorizationUrl(
    pkceParams: PKCEParams,
    config: Partial<ClaudeMaxOAuthConfig> = {}
  ): string {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (!finalConfig.clientId) {
      throw new Error('Claude Max client ID is required');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: finalConfig.clientId,
      redirect_uri: finalConfig.redirectUri,
      scope: finalConfig.scopes.join(' '),
      state: pkceParams.state,
      code_challenge: pkceParams.codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${finalConfig.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    config: Partial<ClaudeMaxOAuthConfig> = {}
  ): Promise<OAuthTokenResponse> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (!finalConfig.clientId) {
      throw new Error('Claude Max client ID is required');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: finalConfig.clientId,
      code,
      redirect_uri: finalConfig.redirectUri,
      code_verifier: codeVerifier,
    });

    try {
      const response = await fetch(finalConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorResponse = OAuthErrorResponseSchema.parse(data);
        throw new Error(`OAuth error: ${errorResponse.error} - ${errorResponse.error_description}`);
      }

      return OAuthTokenResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh an expired access token
   */
  static async refreshToken(
    refreshToken: string,
    config: Partial<ClaudeMaxOAuthConfig> = {}
  ): Promise<OAuthTokenResponse> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (!finalConfig.clientId) {
      throw new Error('Claude Max client ID is required');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: finalConfig.clientId,
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch(finalConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorResponse = OAuthErrorResponseSchema.parse(data);
        throw new Error(
          `OAuth refresh error: ${errorResponse.error} - ${errorResponse.error_description}`
        );
      }

      return OAuthTokenResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke an access or refresh token
   */
  static async revokeToken(
    token: string,
    tokenType: 'access_token' | 'refresh_token' = 'access_token',
    config: Partial<ClaudeMaxOAuthConfig> = {}
  ): Promise<void> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (!finalConfig.clientId) {
      throw new Error('Claude Max client ID is required');
    }

    const params = new URLSearchParams({
      token,
      token_type_hint: tokenType,
      client_id: finalConfig.clientId,
    });

    try {
      const response = await fetch(`${finalConfig.tokenEndpoint}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorResponse = OAuthErrorResponseSchema.parse(data);
        throw new Error(
          `OAuth revoke error: ${errorResponse.error} - ${errorResponse.error_description}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Check if a token is expired or will expire soon
   */
  static isTokenExpired(expiresAt: Date, bufferMinutes = 5): boolean {
    const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
    return expiresAt.getTime() - bufferTime <= Date.now();
  }

  /**
   * Calculate token expiration date from expires_in seconds
   */
  static calculateExpirationDate(expiresInSeconds: number): Date {
    return new Date(Date.now() + expiresInSeconds * 1000);
  }
}
