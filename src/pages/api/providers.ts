import type { APIRoute } from 'astro';
import { ProviderService } from '../../lib/services/provider-service';

/**
 * API endpoint for provider management.
 * Handles CRUD operations for AI providers.
 */

/**
 * GET /api/providers
 * Returns list of providers with optional filtering and pagination.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new globalThis.URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const result = await ProviderService.getProviders(queryParams);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching providers:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

/**
 * POST /api/providers
 * Creates a new AI provider.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const provider = await ProviderService.createProvider(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: provider,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating provider:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
