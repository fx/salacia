import type { APIRoute } from 'astro';
import { z } from 'zod';
import { OAuthService } from '../../../../lib/auth/oauth-service';
import { TokenManager } from '../../../../lib/auth/token-manager';
import { oauthSessions } from './authorize';

/**
 * OAuth callback parameters schema
 */
const CallbackParamsSchema = z.object({
  code: z.string(),
  state: z.string(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/**
 * GET /api/auth/oauth/callback
 *
 * Handles OAuth 2.0 authorization callback from Claude Max
 * Exchanges authorization code for access token and stores in database
 *
 * Query parameters:
 * - code: Authorization code from OAuth provider
 * - state: State parameter for CSRF protection
 * - error: Error code if authorization failed
 * - error_description: Human-readable error description
 *
 * Response:
 * - 302 redirect to success/error page
 * - 400 for invalid parameters or CSRF mismatch
 * - 500 for server errors
 */
export const GET: APIRoute = async ({ request, redirect }) => {
  try {
    // Parse callback parameters
    const url = new globalThis.URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const callbackParams = CallbackParamsSchema.parse(queryParams);

    // Check for OAuth error response
    if (callbackParams.error) {
      const errorMessage = callbackParams.error_description || callbackParams.error;
      console.error('OAuth authorization failed:', errorMessage);

      return redirect(
        `/settings/providers?error=${encodeURIComponent(`OAuth authorization failed: ${errorMessage}`)}`,
        302
      );
    }

    // Retrieve session data using state parameter
    const sessionData = oauthSessions.get(callbackParams.state);
    if (!sessionData) {
      console.error('OAuth callback: Invalid or expired state parameter');
      return redirect(
        `/settings/providers?error=${encodeURIComponent('Invalid or expired OAuth session')}`,
        302
      );
    }

    // Clean up session
    oauthSessions.delete(callbackParams.state);

    // Verify state matches (CSRF protection)
    if (callbackParams.state !== sessionData.pkceParams.state) {
      console.error('OAuth callback: State parameter mismatch');
      return redirect(
        `/settings/providers?error=${encodeURIComponent('OAuth state mismatch')}`,
        302
      );
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await OAuthService.exchangeCodeForToken(
        callbackParams.code,
        sessionData.pkceParams.codeVerifier,
        {
          clientId: sessionData.clientId,
          redirectUri: sessionData.redirectUri,
        }
      );

      // Store token data in database
      await TokenManager.storeTokenData(
        sessionData.providerId,
        tokenResponse,
        sessionData.clientId || '',
        tokenResponse.scope
      );

      console.warn('OAuth authentication successful for provider:', sessionData.providerId);

      // Redirect to provider settings with success message
      return redirect(
        `/settings/providers?success=${encodeURIComponent('OAuth authentication successful')}`,
        302
      );
    } catch (tokenError) {
      console.error('OAuth token exchange failed:', tokenError);

      const errorMessage =
        tokenError instanceof Error
          ? tokenError.message
          : 'Failed to exchange authorization code for token';

      return redirect(
        `/settings/providers?error=${encodeURIComponent(`OAuth token exchange failed: ${errorMessage}`)}`,
        302
      );
    }
  } catch (error) {
    console.error('OAuth callback error:', error);

    if (error instanceof z.ZodError) {
      return redirect(
        `/settings/providers?error=${encodeURIComponent('Invalid OAuth callback parameters')}`,
        302
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : 'OAuth callback processing failed';

    return redirect(`/settings/providers?error=${encodeURIComponent(errorMessage)}`, 302);
  }
};
