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
import type { InferCreationAttributes } from 'sequelize';

const logger = createLogger('MessageLogger');

/**
 * Interface for AI interaction creation data structure.
 * Provides type safety for database operations.
 */
interface InteractionCreationData {
  providerId?: string;
  model: string;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
  responseTimeMs?: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Interface for API request creation data structure.
 * Provides type safety for database operations.
 */
interface ApiRequestCreationData {
  method: string;
  path: string;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  userAgent?: string;
  ipAddress?: string;
  statusCode?: number;
  responseTime?: number;
  responseSize?: number;
}

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
    // Extract token counts from response
    const promptTokens = response?.usage?.input_tokens;
    const completionTokens = response?.usage?.output_tokens;

    // Calculate total tokens as sum of prompt and completion tokens
    let totalTokens: number | undefined;
    if (promptTokens !== undefined && completionTokens !== undefined) {
      totalTokens = promptTokens + completionTokens;
    } else if (promptTokens !== undefined) {
      totalTokens = promptTokens;
    } else if (completionTokens !== undefined) {
      totalTokens = completionTokens;
    }

    // Prepare the interaction data
    const interactionData: InteractionCreationData = {
      model: request.model,
      request: request as Record<string, unknown>,
      response: response as Record<string, unknown> | undefined,
      error: error ? (typeof error === 'string' ? error : error.message) : undefined,
      statusCode,
      responseTimeMs: responseTime,
      totalTokens,
      promptTokens,
      completionTokens,
    };

    // Create the database record
    const interaction = await AiInteraction.create(
      interactionData as InferCreationAttributes<AiInteraction>
    );

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

    const apiRequestData: ApiRequestCreationData = {
      method: request.method,
      path: url.pathname,
      headers: headers as Record<string, unknown>,
      query: Object.fromEntries(url.searchParams) as Record<string, unknown>,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      statusCode,
      responseTime,
      responseSize,
    };

    const apiRequest = await ApiRequest.create(
      apiRequestData as InferCreationAttributes<ApiRequest>
    );

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
