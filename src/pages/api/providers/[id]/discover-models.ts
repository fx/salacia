import type { APIRoute } from 'astro';
import { ProviderManager } from '../../../../lib/ai/provider-manager';
import { AiProvider as AiProviderModel } from '../../../../lib/db/models/AiProvider';

/**
 * API endpoint to discover available models from an Ollama provider
 *
 * This endpoint connects to the Ollama server and retrieves the list of
 * available models that can be used for inference.
 */
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const providerId = params.id;
    if (!providerId) {
      return new Response(JSON.stringify({ success: false, error: 'Provider ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the provider in the database
    const provider = await AiProviderModel.findByPk(providerId);
    if (!provider) {
      return new Response(JSON.stringify({ success: false, error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only support Ollama providers
    if (provider.type !== 'ollama') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Model discovery is only supported for Ollama providers',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the base URL from the request body or use provider settings
    const body = await request.json();
    const baseUrl = body.baseUrl || provider.baseUrl || 'http://localhost:11434';

    // Discover models from the Ollama server
    const models = await ProviderManager.discoverOllamaModels(baseUrl);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          models,
          baseUrl,
          count: models.length,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error discovering models:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
