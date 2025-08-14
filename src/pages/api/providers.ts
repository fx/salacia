import type { APIRoute } from 'astro';
import { ProviderService } from '../../lib/services/provider-service';
import { createErrorResponse, createSuccessResponse } from '../../lib/utils/api-response';

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

    return createSuccessResponse(result.providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return createErrorResponse(error);
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

    return createSuccessResponse(provider, 201);
  } catch (error) {
    console.error('Error creating provider:', error);
    return createErrorResponse(error, 400);
  }
};
