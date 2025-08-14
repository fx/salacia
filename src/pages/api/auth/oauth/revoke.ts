import type { APIRoute } from 'astro';
import { z } from 'zod';
import { TokenManager } from '../../../../lib/auth/token-manager';

/**
 * Request schema for OAuth token revocation
 */
const RevokeRequestSchema = z.object({
  provider_id: z.string().uuid(),
});

/**
 * POST /api/auth/oauth/revoke
 *
 * Revokes OAuth tokens for a provider and clears them from database
 *
 * Request body:
 * - provider_id: UUID of the provider to revoke tokens for
 *
 * Response:
 * - 204: Tokens revoked successfully
 * - 400: Invalid request parameters
 * - 404: Provider not found
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { provider_id } = RevokeRequestSchema.parse(body);

    await TokenManager.revokeTokens(provider_id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('OAuth token revocation error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to revoke OAuth tokens',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
