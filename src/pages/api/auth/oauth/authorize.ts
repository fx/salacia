import type { APIRoute } from 'astro';
import { z } from 'zod';
import { OAuthService, type PKCEParams } from '../../../../lib/auth/oauth-service';

/**
 * Request schema for OAuth authorization
 */
const AuthorizeRequestSchema = z.object({
  provider_id: z.string().uuid(),
  client_id: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
});

/**
 * Session storage for OAuth state
 * In a production environment, this should use a more persistent storage
 * like Redis or database with proper cleanup
 */
const oauthSessions = new Map<
  string,
  {
    providerId: string;
    pkceParams: PKCEParams;
    clientId?: string;
    redirectUri?: string;
    createdAt: Date;
  }
>();

// Clean up expired sessions every 10 minutes
setInterval(
  () => {
    const now = new Date();
    const expiredCutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

    for (const [sessionId, session] of oauthSessions.entries()) {
      if (session.createdAt < expiredCutoff) {
        oauthSessions.delete(sessionId);
      }
    }
  },
  10 * 60 * 1000
);

/**
 * GET /api/auth/oauth/authorize
 *
 * Initiates OAuth 2.0 authorization flow with PKCE for Claude Max
 *
 * Query parameters:
 * - provider_id: UUID of the provider to authenticate
 * - client_id: OAuth client ID (optional, uses env default)
 * - redirect_uri: OAuth redirect URI (optional, uses env default)
 * - scopes: Array of OAuth scopes (optional, uses default)
 *
 * Response:
 * - 302 redirect to OAuth authorization URL
 * - 400 for invalid parameters
 * - 500 for server errors
 */
export const GET: APIRoute = async ({ request, redirect }) => {
  try {
    // Parse query parameters
    const url = new globalThis.URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Handle array parameter for scopes
    let scopesArray: string[] | undefined;
    if (queryParams.scopes) {
      try {
        scopesArray = JSON.parse(queryParams.scopes as string);
      } catch {
        // If not valid JSON, treat as single scope
        scopesArray = [queryParams.scopes as string];
      }
    }

    const validatedParams = AuthorizeRequestSchema.parse({
      ...queryParams,
      scopes: scopesArray,
    });

    // Generate PKCE parameters
    const pkceParams = await OAuthService.generatePKCEParams();

    // Store session data
    const sessionId = pkceParams.state; // Use state as session ID
    oauthSessions.set(sessionId, {
      providerId: validatedParams.provider_id,
      pkceParams,
      clientId: validatedParams.client_id,
      redirectUri: validatedParams.redirect_uri,
      createdAt: new Date(),
    });

    // Generate authorization URL
    const authUrl = OAuthService.generateAuthorizationUrl(pkceParams, {
      clientId: validatedParams.client_id,
      redirectUri: validatedParams.redirect_uri,
      scopes: validatedParams.scopes || ['read', 'write'],
    });

    return redirect(authUrl, 302);
  } catch (error) {
    console.error('OAuth authorization error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth authorization',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Export session storage for use in callback handler
 * This is a temporary solution - in production, use proper session storage
 */
export { oauthSessions };
