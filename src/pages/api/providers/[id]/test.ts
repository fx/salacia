import type { APIRoute } from 'astro';
import { ProviderService } from '../../../../lib/services/provider-service';
import { createErrorResponse, createSuccessResponse } from '../../../../lib/utils/api-response';

/**
 * API endpoint for testing provider connectivity.
 * POST /api/providers/:id/test
 */

/**
 * POST /api/providers/:id/test
 * Tests connectivity for a specific provider.
 *
 * Success: returns the test result directly { success: boolean, error?: string }
 * Not found: returns 404 with { error: 'Provider not found' }
 */
export const POST: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return createErrorResponse(new Error('Provider ID is required'), 400);
    }

    const testResult = await ProviderService.testProvider(id);

    if (!testResult.success && testResult.error === 'Provider not found') {
      return createErrorResponse(new Error('Provider not found'), 404);
    }

    return createSuccessResponse(testResult);
  } catch (error) {
    console.error('Error testing provider:', error);
    return createErrorResponse(error);
  }
};
