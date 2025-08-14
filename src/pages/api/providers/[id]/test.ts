import type { APIRoute } from 'astro';
import { ProviderService } from '../../../../lib/services/provider-service';

/**
 * API endpoint for testing provider connectivity.
 * POST /api/providers/:id/test
 */

/**
 * POST /api/providers/:id/test
 * Tests connectivity for a specific provider.
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

    const testResult = await ProviderService.testProvider(id);

    return new Response(JSON.stringify({ success: true, data: testResult }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error testing provider:', error);

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
