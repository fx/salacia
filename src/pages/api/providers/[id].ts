import type { APIRoute } from 'astro';
import { ProviderService } from '../../../lib/services/provider-service';

/**
 * API endpoint for individual provider management.
 * Handles GET, PUT, and DELETE operations for specific providers.
 */

/**
 * GET /api/providers/:id
 * Returns a single provider by ID.
 */
export const GET: APIRoute = async ({ params }) => {
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

    const provider = await ProviderService.getProvider(id);

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

    return new Response(JSON.stringify(provider), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching provider:', error);

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

/**
 * PUT /api/providers/:id
 * Updates a provider by ID.
 */
export const PUT: APIRoute = async ({ params, request }) => {
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

    const body = await request.json();
    const provider = await ProviderService.updateProvider(id, body);

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

    return new Response(JSON.stringify(provider), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating provider:', error);

    // Return 400 for malformed JSON, 422 for validation errors, 500 for others
    let status = 500;
    if (error instanceof SyntaxError) {
      status = 400;
    } else if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ValidationError' // typical validation error
    ) {
      status = 422;
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

/**
 * DELETE /api/providers/:id
 * Deletes a provider by ID.
 */
export const DELETE: APIRoute = async ({ params }) => {
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

    const deleted = await ProviderService.deleteProvider(id);

    if (!deleted) {
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

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    console.error('Error deleting provider:', error);

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
