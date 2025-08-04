import type { AnthropicRequest } from './types';
import { createLogger } from '../utils/logger';

const logger = createLogger('API/Utils');

/**
 * Standard error types for Anthropic API compatibility
 */
export const API_ERROR_TYPES = {
  INVALID_REQUEST_ERROR: 'invalid_request_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  PERMISSION_ERROR: 'permission_error',
  NOT_FOUND_ERROR: 'not_found_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  API_ERROR: 'api_error',
  OVERLOADED_ERROR: 'overloaded_error',
} as const;

export type ApiErrorType = (typeof API_ERROR_TYPES)[keyof typeof API_ERROR_TYPES];

/**
 * Standard error response format for Anthropic API
 */
export interface ApiErrorResponse {
  type: 'error';
  error: {
    type: ApiErrorType;
    message: string;
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  type: ApiErrorType,
  message: string,
  status: number = 400
): Response {
  const errorResponse: ApiErrorResponse = {
    type: 'error',
    error: { type, message },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Validate required headers for API requests
 */
export function validateHeaders(request: Request): {
  isValid: boolean;
  error?: Response;
} {
  const contentType = request.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    return {
      isValid: false,
      error: createErrorResponse(
        API_ERROR_TYPES.INVALID_REQUEST_ERROR,
        'Content-Type must be application/json',
        400
      ),
    };
  }

  return { isValid: true };
}

/**
 * Extract and validate request body as JSON
 */
export async function parseRequestBody<T>(
  request: Request,
  validator: (_data: unknown) => T
): Promise<{ data?: T; error?: Response }> {
  try {
    const rawBody = await request.text();

    if (!rawBody.trim()) {
      return {
        error: createErrorResponse(
          API_ERROR_TYPES.INVALID_REQUEST_ERROR,
          'Request body is empty',
          400
        ),
      };
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (_jsonError) {
      return {
        error: createErrorResponse(
          API_ERROR_TYPES.INVALID_REQUEST_ERROR,
          'Invalid JSON in request body',
          400
        ),
      };
    }

    try {
      const validatedData = validator(parsedBody);
      return { data: validatedData };
    } catch (validationError) {
      logger.debug('Request validation error:', validationError);
      return {
        error: createErrorResponse(
          API_ERROR_TYPES.INVALID_REQUEST_ERROR,
          'Invalid request format or missing required fields',
          400
        ),
      };
    }
  } catch (error) {
    logger.error('Request parsing error:', error);
    return {
      error: createErrorResponse(API_ERROR_TYPES.API_ERROR, 'Failed to process request', 500),
    };
  }
}

/**
 * Simple token estimation utility
 * This provides a rough approximation for logging purposes
 */
export function estimateTokens(messages: AnthropicRequest['messages']): number {
  let totalTokens = 0;

  for (const message of messages) {
    if (typeof message.content === 'string') {
      // Rough approximation: 1 token per 4 characters
      totalTokens += Math.ceil(message.content.length / 4);
    } else if (Array.isArray(message.content)) {
      // Handle multimodal content
      for (const contentBlock of message.content) {
        if ('text' in contentBlock && contentBlock.text) {
          totalTokens += Math.ceil(contentBlock.text.length / 4);
        }
        // For image content, add a fixed token count
        if (contentBlock.type === 'image') {
          totalTokens += 85; // Base tokens for image processing
        }
      }
    }
  }

  return totalTokens;
}

/**
 * Generate a unique message ID in Anthropic format
 */
export function generateMessageId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 11);
  return `msg_${timestamp}_${randomSuffix}`;
}

/**
 * Rate limiting check (placeholder for future implementation)
 */
export function checkRateLimit(_clientId: string): {
  allowed: boolean;
  resetTime?: number;
  remaining?: number;
} {
  // Placeholder - implement actual rate limiting logic here
  return { allowed: true };
}

/**
 * Authentication check (placeholder for future implementation)
 */
export function validateApiKey(_apiKey?: string): {
  isValid: boolean;
  userId?: string;
} {
  // Placeholder - implement actual API key validation here
  // For now, accept any request without authentication
  return { isValid: true };
}

/**
 * CORS headers for API responses
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
} as const;

/**
 * Handle preflight OPTIONS requests
 */
export function handleOptions(): Response {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
