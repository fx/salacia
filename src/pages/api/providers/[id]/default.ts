import type { APIRoute } from 'astro';
import { ProviderService } from '../../../../lib/services/provider-service';
import { createErrorResponse, createSuccessResponse } from '../../../../lib/utils/api-response';

/**
 * API endpoint for setting a provider as default.
 * POST /api/providers/:id/default
 */

/**
 * POST /api/providers/:id/default
 * Sets a provider as the default provider.
 *
 * Success: returns the updated Provider object directly (no wrapper)
 * Errors: return { success: false, error: string } with appropriate status code
 */
export const POST: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return createErrorResponse(new Error('Provider ID is required'), 400);
    }

    const provider = await ProviderService.setDefaultProvider(id);

    if (!provider) {
      return createErrorResponse(new Error('Provider not found'), 404);
    }

    return createSuccessResponse(provider);
  } catch (error) {
    console.error('Error setting default provider:', error);
    return createErrorResponse(error);
  }
};
