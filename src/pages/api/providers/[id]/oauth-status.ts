import type { APIRoute } from 'astro';
import { ProviderService } from '../../../../lib/services/provider-service';
import { TokenManager } from '../../../../lib/auth/token-manager';

/**
 * GET /api/providers/:id/oauth-status
 *
 * Get OAuth authentication status for a specific provider
 *
 * Path parameters:
 * - id: Provider UUID
 *
 * Response:
 * - 200: OAuth status information
 * - 404: Provider not found
 * - 500: Server error
 */
export const GET: APIRoute = async ({ params }) => {
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

    // Get OAuth status
    const tokenStatus = await TokenManager.getTokenStatus(providerId);
    const hasValidTokens = await TokenManager.hasValidTokens(providerId);

    const responseData = {
      providerId,
      providerName: provider.name,
      authType: provider.authType,
      supportsOAuth: provider.type === 'anthropic',
      hasOAuthTokens: provider.authType === 'oauth' && !!provider.oauthAccessToken,
      ...tokenStatus,
      hasValidTokens,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth status check error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check OAuth status',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
