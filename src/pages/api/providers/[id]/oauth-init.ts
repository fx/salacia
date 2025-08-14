import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ProviderService } from '../../../../lib/services/provider-service';
import { OAuthService } from '../../../../lib/auth/oauth-service';
import { oauthSessions } from '../../../../lib/auth/oauth-sessions';

/**
 * Request schema for OAuth initialization
 */
const OAuthInitRequestSchema = z.object({
  client_id: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
});

/**
 * POST /api/providers/:id/oauth-init
 *
 * Initialize OAuth authentication flow for a provider
 *
 * Path parameters:
 * - id: Provider UUID
 *
 * Request body:
 * - client_id: OAuth client ID (optional, uses provider's or env default)
 * - redirect_uri: OAuth redirect URI (optional, uses env default)
 * - scopes: Array of OAuth scopes (optional, uses default)
 *
 * Response:
 * - 302: Redirect to OAuth authorization URL
 * - 400: Invalid parameters or provider not found
 * - 422: Provider not configured for OAuth
 * - 500: Server error
 */
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const providerId = params.id;
    if (!providerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Provider ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get provider from database
    const provider = await ProviderService.getProvider(providerId);
    if (!provider) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Provider not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify provider is configured for OAuth or can be converted
    if (provider.authType !== 'oauth' && provider.type !== 'anthropic') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Provider does not support OAuth authentication',
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedParams = OAuthInitRequestSchema.parse(body);

    // Generate PKCE parameters and store session
    const pkceParams = await OAuthService.generatePKCEParams();

    // Store session data by provider ID for callback
    const sessionData = {
      providerId: providerId,
      pkceParams,
      clientId: validatedParams.client_id || '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
      redirectUri:
        validatedParams.redirect_uri || 'https://console.anthropic.com/oauth/code/callback',
      createdAt: new Date(),
    };

    // Store by both state and provider ID
    oauthSessions.set(pkceParams.state, sessionData);
    oauthSessions.set(providerId, sessionData);

    // Generate authorization URL
    const authUrl = OAuthService.generateAuthorizationUrl(pkceParams, {
      clientId: validatedParams.client_id,
      redirectUri: validatedParams.redirect_uri,
      scopes: validatedParams.scopes,
    });

    // Return authorization URL for client to redirect to
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authorizationUrl: authUrl,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth initialization error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to initialize OAuth flow',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
