import { z } from 'zod';

/**
 * OAuth 2.0 PKCE (Proof Key for Code Exchange) implementation
 * for secure authentication with Claude Max
 */

/**
 * Generate cryptographically secure random string for PKCE
 * Uses rejection sampling to avoid modulo bias
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const charsetLength = charset.length;
  const randomChars: string[] = [];

  while (randomChars.length < length) {
    // Draw more random bytes than needed, to account for possible rejections
    const array = new Uint8Array(length - randomChars.length);
    globalThis.crypto.getRandomValues(array);

    for (let i = 0; i < array.length && randomChars.length < length; i++) {
      const byte = array[i];
      // Accept only bytes that can be mapped without bias
      if (byte < charsetLength * Math.floor(256 / charsetLength)) {
        randomChars.push(charset[byte % charsetLength]);
      }
    }
  }

  return randomChars.join('');
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
    // Load client ID and redirect URI from environment variables for security
    clientId: process.env.CLAUDE_MAX_OAUTH_CLIENT_ID ?? '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
    redirectUri:
      process.env.CLAUDE_MAX_OAUTH_REDIRECT_URI ??
      'https://console.anthropic.com/oauth/code/callback',
    scopes: ['org:create_api_key', 'user:profile', 'user:inference'],
    authorizationEndpoint: 'https://claude.ai/oauth/authorize',
    tokenEndpoint: 'https://console.anthropic.com/v1/oauth/token',
  };

  /**
   * Validate OAuth configuration is properly set up
   *
   * @throws {Error} If required environment variables are missing for production
   */
  private static validateOAuthConfig(): void {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.CLAUDE_MAX_OAUTH_CLIENT_ID) {
        throw new Error('Missing required environment variable: CLAUDE_MAX_OAUTH_CLIENT_ID');
      }
      if (!process.env.CLAUDE_MAX_OAUTH_REDIRECT_URI) {
        throw new Error('Missing required environment variable: CLAUDE_MAX_OAUTH_REDIRECT_URI');
      }
    }
  }

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
    // Validate OAuth configuration
    this.validateOAuthConfig();

    // Filter out undefined values from config to avoid overriding defaults
    const cleanConfig = Object.fromEntries(
      Object.entries(config).filter(([_, v]) => v !== undefined)
    ) as Partial<ClaudeMaxOAuthConfig>;
    const finalConfig = { ...this.DEFAULT_CONFIG, ...cleanConfig };

    if (!finalConfig.clientId) {
      throw new Error('Claude Max client ID is required');
    }

    const params = new URLSearchParams({
      code: 'true', // OpenCode includes this parameter
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
    config: Partial<ClaudeMaxOAuthConfig> = {},
    state?: string
  ): Promise<OAuthTokenResponse> {
    // Validate OAuth configuration
    this.validateOAuthConfig();

    // Filter out undefined values from config to avoid overriding defaults
    const cleanConfig = Object.fromEntries(
      Object.entries(config).filter(([_, v]) => v !== undefined)
    ) as Partial<ClaudeMaxOAuthConfig>;
    const finalConfig = { ...this.DEFAULT_CONFIG, ...cleanConfig };

    if (!finalConfig.clientId) {
      throw new Error('Claude Max client ID is required');
    }

    // OpenCode sends JSON body, not form-urlencoded
    const requestBody = {
      code,
      state: state || '', // State is required in the JSON body
      grant_type: 'authorization_code',
      client_id: finalConfig.clientId,
      redirect_uri: finalConfig.redirectUri,
      code_verifier: codeVerifier,
    };

    try {
      const response = await fetch(finalConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // JSON, not form-urlencoded!
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        // Try to parse as OAuth error, but handle non-standard error responses
        try {
          const errorResponse = OAuthErrorResponseSchema.parse(data);
          throw new Error(
            `OAuth error: ${errorResponse.error} - ${errorResponse.error_description}`
          );
        } catch (_parseError) {
          // If error doesn't match OAuth schema, create a generic error message
          const errorMessage =
            typeof data === 'object' && data !== null ? JSON.stringify(data) : String(data);
          throw new Error(`OAuth token exchange failed: ${errorMessage}`);
        }
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
        // Try to parse as OAuth error, but handle non-standard error responses
        try {
          const errorResponse = OAuthErrorResponseSchema.parse(data);
          throw new Error(
            `OAuth refresh error: ${errorResponse.error} - ${errorResponse.error_description}`
          );
        } catch (_parseError) {
          // If error doesn't match OAuth schema, create a generic error message
          const errorMessage =
            typeof data === 'object' && data !== null ? JSON.stringify(data) : String(data);
          throw new Error(`OAuth token refresh failed: ${errorMessage}`);
        }
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
    // Filter out undefined values from config to avoid overriding defaults
    const cleanConfig = Object.fromEntries(
      Object.entries(config).filter(([_, v]) => v !== undefined)
    ) as Partial<ClaudeMaxOAuthConfig>;
    const finalConfig = { ...this.DEFAULT_CONFIG, ...cleanConfig };

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
