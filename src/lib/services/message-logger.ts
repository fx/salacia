/**
 * Service for logging AI interactions to the database.
 * Handles both successful and failed API requests.
 *
 * @module MessageLogger
 */

import { AiInteraction } from '../db/models/AiInteraction';
import { ApiRequest } from '../db/models/ApiRequest';
import type { AnthropicRequest, AnthropicResponse } from '../ai/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('MessageLogger');

/**
 * Log an AI interaction to the database.
 * Records both the request and response/error for audit and realtime purposes.
 *
 * @param request - The original Anthropic request
 * @param response - The response (if successful)
 * @param error - The error (if failed)
 * @param responseTime - Response time in milliseconds
 * @returns The created AiInteraction record
 */
export async function logAiInteraction({
  request,
  response,
  error,
  responseTime,
  statusCode,
}: {
  request: AnthropicRequest;
  response?: AnthropicResponse;
  error?: Error | string;
  responseTime: number;
  statusCode: number;
}) {
  try {
    // Prepare the interaction data
    const interactionData: any = {
      model: request.model,
      provider: 'anthropic', // Could be extended to support other providers
      request: JSON.stringify(request),
      response: response ? JSON.stringify(response) : null,
      error: error ? (typeof error === 'string' ? error : error.message) : null,
      statusCode,
      responseTime,
      totalTokens: response?.usage?.output_tokens ?? null,
      promptTokens: response?.usage?.input_tokens ?? null,
      completionTokens: response?.usage?.output_tokens ?? null,
    };

    // Create the database record
    const interaction = await AiInteraction.create(interactionData);

    logger.debug('Logged AI interaction:', {
      id: interaction.id,
      model: interaction.model,
      statusCode: interaction.statusCode,
      hasError: !!interaction.error,
    });

    return interaction;
  } catch (logError) {
    // Don't let logging errors break the API
    logger.error('Failed to log AI interaction:', logError);
    return null;
  }
}

/**
 * Log an API request to the database.
 * Records HTTP request details for monitoring and debugging.
 *
 * @param request - The HTTP request object
 * @param response - Response details
 * @returns The created ApiRequest record
 */
export async function logApiRequest({
  request,
  statusCode,
  responseTime,
  responseSize,
}: {
  request: Request;
  statusCode: number;
  responseTime: number;
  responseSize?: number;
}) {
  try {
    const url = new globalThis.URL(request.url);

    // Extract headers (excluding sensitive ones)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.toLowerCase().includes('key') && !key.toLowerCase().includes('auth')) {
        headers[key] = value;
      }
    });

    const apiRequestData: any = {
      method: request.method,
      path: url.pathname,
      headers,
      query: Object.fromEntries(url.searchParams),
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      statusCode,
      responseTime,
      responseSize,
    };

    const apiRequest = await ApiRequest.create(apiRequestData);

    logger.debug('Logged API request:', {
      id: apiRequest.id,
      method: apiRequest.method,
      path: apiRequest.path,
      statusCode: apiRequest.statusCode,
    });

    return apiRequest;
  } catch (logError) {
    // Don't let logging errors break the API
    logger.error('Failed to log API request:', logError);
    return null;
  }
}
