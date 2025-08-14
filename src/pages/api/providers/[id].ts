import type { APIRoute } from 'astro';
import { ProviderService } from '../../../lib/services/provider-service';
import {
  createErrorResponse,
  createSuccessResponse,
  createNoContentResponse,
} from '../../../lib/utils/api-response';

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
      return createErrorResponse(new Error('Provider ID is required'), 400);
    }

    const provider = await ProviderService.getProvider(id);

    if (!provider) {
      return createErrorResponse(new Error('Provider not found'), 404);
    }

    return createSuccessResponse(provider);
  } catch (error) {
    console.error('Error fetching provider:', error);
    return createErrorResponse(error);
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
      return createErrorResponse(new Error('Provider ID is required'), 400);
    }

    const body = await request.json();
    const provider = await ProviderService.updateProvider(id, body);

    if (!provider) {
      return createErrorResponse(new Error('Provider not found'), 404);
    }

    return createSuccessResponse(provider);
  } catch (error) {
    console.error('Error updating provider:', error);
    return createErrorResponse(error);
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
      return createErrorResponse(new Error('Provider ID is required'), 400);
    }

    const deleted = await ProviderService.deleteProvider(id);

    if (!deleted) {
      return createErrorResponse(new Error('Provider not found'), 404);
    }

    return createNoContentResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Cannot delete default provider') {
      return createErrorResponse(error, 400);
    }
    if (message === 'Provider not found') {
      return createErrorResponse(error, 404);
    }

    console.error('Error deleting provider:', error);
    return createErrorResponse(error);
  }
};
