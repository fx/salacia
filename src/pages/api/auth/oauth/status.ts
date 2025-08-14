import type { APIRoute } from 'astro';
import { TokenManager } from '../../../../lib/auth/token-manager';

/**
 * GET /api/auth/oauth/status?provider_id=:id
 *
 * Get OAuth token status for a provider
 *
 * Query parameters:
 * - provider_id: UUID of the provider
 *
 * Response:
 * - 200: Token status information
 * - 404: Provider not found
 * - 500: Server error
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new globalThis.URL(request.url);
    const providerId = url.searchParams.get('provider_id');

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

    const status = await TokenManager.getTokenStatus(providerId);
    const hasValidTokens = await TokenManager.hasValidTokens(providerId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...status,
          hasValidTokens,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth status check error:', error);

    if (error instanceof Error && error.message === 'Provider not found') {
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
