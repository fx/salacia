import type { APIRoute } from 'astro';
import { ProviderService } from '../../../../lib/services/provider-service';

/**
 * API endpoint for setting a provider as default.
 * POST /api/providers/:id/set-default
 */

/**
 * POST /api/providers/:id/set-default
 * Sets a provider as the default provider.
 */
export const POST: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Provider ID is required',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const provider = await ProviderService.setDefaultProvider(id);

    if (!provider) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Provider not found',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: provider,
        message: 'Provider set as default successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error setting default provider:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
