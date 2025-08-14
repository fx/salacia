import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ProviderService } from '../../../../lib/services/provider-service';
import { OAuthService } from '../../../../lib/auth/oauth-service';
import { TokenManager } from '../../../../lib/auth/token-manager';
import { oauthSessions } from '../../../../lib/auth/oauth-sessions';

/**
 * Request schema for OAuth callback code submission
 */
const OAuthCallbackRequestSchema = z.object({
  callbackCode: z.string().min(1, 'Callback code is required'),
});

/**
 * POST /api/providers/:id/oauth-callback
 *
 * Process OAuth callback code and exchange for tokens
 *
 * Path parameters:
 * - id: Provider UUID
 *
 * Request body:
 * - callbackCode: The callback from OAuth provider (formats: full URL, "code#state", or just "code")
 *
 * Response:
 * - 200: Successfully exchanged code for tokens
 * - 400: Invalid parameters
 * - 404: Provider not found
 * - 422: Invalid callback code format
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

    // Parse request body
    const body = await request.json();
    const validatedData = OAuthCallbackRequestSchema.parse(body);

    // Parse the callback input - can be a URL, code#state, or just code
    let code: string;
    let state: string | undefined;

    const input = validatedData.callbackCode.trim();

    // Check if it's a full URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      try {
        const url = new globalThis.URL(input);
        code = url.searchParams.get('code') || '';
        state = url.searchParams.get('state') || undefined;
        if (!code) {
          throw new Error('No code parameter found in URL');
        }
      } catch (_e) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid callback URL format',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } else if (input.includes('#')) {
      // Format: code#state
      const parts = input.split('#');
      code = parts[0];
      state = parts[1];
    } else {
      // Just the code
      code = input;
    }

    // Try to find session by state first (if provided), then by provider ID
    const session = state
      ? oauthSessions.get(state) || oauthSessions.get(providerId)
      : oauthSessions.get(providerId);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired OAuth session. Please try connecting again.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the session belongs to this provider
    if (session.providerId !== providerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OAuth session mismatch',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Exchange code for tokens - pass state as required by OpenCode's implementation
    const tokenResponse = await OAuthService.exchangeCodeForToken(
      code,
      session.pkceParams.codeVerifier,
      {
        clientId: session.clientId,
        redirectUri: session.redirectUri,
      },
      state || session.pkceParams.state // Use the state from callback or fallback to session state
    );

    // Store tokens using TokenManager
    await TokenManager.storeTokenData(
      providerId,
      tokenResponse,
      '9d1c250a-e61b-44d9-88ed-5944d1962f5e', // Claude Max client ID
      tokenResponse.scope
    );

    // Clean up the sessions (both by state and provider ID)
    oauthSessions.delete(session.pkceParams.state);
    oauthSessions.delete(providerId);
    if (state) {
      oauthSessions.delete(state);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: 'OAuth authentication successful',
          expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to process OAuth callback',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
