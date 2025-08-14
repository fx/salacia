import type { APIRoute } from 'astro';
import { z } from 'zod';
import { OAuthService } from '../../../../lib/auth/oauth-service';
import { oauthSessions } from '../../../../lib/auth/oauth-sessions';

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

    // Store session data by provider ID for callback
    // Also store by state for potential direct callback handling
    const sessionData = {
      providerId: validatedParams.provider_id,
      pkceParams,
      clientId: validatedParams.client_id,
      redirectUri: validatedParams.redirect_uri,
      createdAt: new Date(),
    };
    oauthSessions.set(pkceParams.state, sessionData); // Store by state
    oauthSessions.set(validatedParams.provider_id, sessionData); // Store by provider ID for manual callback

    // Generate authorization URL
    const authUrl = OAuthService.generateAuthorizationUrl(pkceParams, {
      clientId: validatedParams.client_id,
      redirectUri: validatedParams.redirect_uri,
      scopes: validatedParams.scopes, // Let OAuthService use its defaults
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
