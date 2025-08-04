/**
 * Custom error classes for API endpoint error handling.
 * Provides type-safe error handling and consistent error responses.
 */

/**
 * Base class for all API-related errors.
 * Provides common structure and functionality for API error handling.
 */
export abstract class ApiError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    // Store cause for error chaining
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Error thrown when request validation fails.
 * Used for invalid parameters, malformed data, etc.
 */
export class ValidationError extends ApiError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';
  
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Error thrown when a UUID parameter is invalid.
 * Specific case of validation error for UUID format issues.
 */
export class InvalidUuidError extends ValidationError {
  readonly errorCode = 'INVALID_UUID';
  
  constructor(uuid: string, cause?: Error) {
    super(`The provided ID is not a valid UUID format: ${uuid}`, cause);
  }
}

/**
 * Error thrown when a requested resource is not found.
 * Results in 404 HTTP status code.
 */
export class NotFoundError extends ApiError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
  
  constructor(resource: string, identifier: string, cause?: Error) {
    super(`${resource} not found with identifier: ${identifier}`, cause);
  }
}

/**
 * Error thrown when database operations fail.
 * Results in 503 HTTP status code to indicate service unavailability.
 */
export class DatabaseError extends ApiError {
  readonly statusCode = 503;
  readonly errorCode = 'DATABASE_ERROR';
  
  constructor(operation: string, cause?: Error) {
    super(`Database operation failed: ${operation}`, cause);
  }
}

/**
 * Error thrown when pagination parameters exceed limits.
 * Specific case of validation error for pagination issues.
 */
export class PaginationError extends ValidationError {
  readonly errorCode = 'PAGINATION_ERROR';
  
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Utility function to classify errors from the MessagesService.
 * Converts generic Error objects into specific ApiError types based on message content.
 * 
 * @param error - The error to classify
 * @param context - Additional context for error classification
 * @returns Appropriate ApiError subclass
 */
export function classifyMessagesServiceError(error: unknown, context?: string): ApiError {
  if (!(error instanceof Error)) {
    return new DatabaseError(context || 'Unknown error occurred');
  }

  const message = error.message.toLowerCase();

  // UUID validation errors
  if (message.includes('invalid uuid format')) {
    const uuidMatch = error.message.match(/invalid uuid format: (.+)$/i);
    const uuid = uuidMatch ? uuidMatch[1] : 'unknown';
    return new InvalidUuidError(uuid, error);
  }

  // Pagination validation errors
  if (message.includes('page number must be greater than 0')) {
    return new PaginationError('Page number must be greater than 0', error);
  }
  if (message.includes('page size must be between')) {
    return new PaginationError('Page size must be between 1 and 100', error);
  }

  // Database connection/operation errors
  if (message.includes('failed to retrieve') || 
      message.includes('database') || 
      message.includes('connection')) {
    return new DatabaseError(context || error.message, error);
  }

  // Generic fallback
  return new DatabaseError(context || error.message, error);
}

/**
 * Creates a standardized JSON error response.
 * 
 * @param error - The ApiError to convert to response
 * @param responseTime - Response time in milliseconds
 * @returns Response object with proper status code and headers
 */
export function createErrorResponse(error: ApiError, responseTime: number): Response {
  return new Response(
    JSON.stringify({
      error: error.errorCode,
      message: error.message,
      timestamp: new Date().toISOString(),
    }),
    {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`,
      },
    }
  );
}