import type { APIRoute } from 'astro';
import { ProviderService } from '../../../../lib/services/provider-service';
import { TokenManager } from '../../../../lib/auth/token-manager';

/**
 * DELETE /api/providers/:id/oauth-revoke
 *
 * Revoke OAuth tokens for a specific provider
 *
 * Path parameters:
 * - id: Provider UUID
 *
 * Response:
 * - 204: Tokens revoked successfully
 * - 404: Provider not found
 * - 422: Provider not using OAuth
 * - 500: Server error
 */
export const DELETE: APIRoute = async ({ params }) => {
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

    // Check if provider is using OAuth
    if (provider.authType !== 'oauth') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Provider is not using OAuth authentication',
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Revoke tokens
    await TokenManager.revokeTokens(providerId);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('OAuth token revocation error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke OAuth tokens',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
