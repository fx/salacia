/**
 * Determines appropriate HTTP status code for different error types
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof SyntaxError) {
    return 400; // Malformed JSON
  }
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
    return 422; // Validation error
  }
  return 500; // Internal server error
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: unknown, statusOverride?: number): Response {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const status = statusOverride ?? getErrorStatusCode(error);

  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Creates a 204 No Content response
 */
export function createNoContentResponse(): Response {
  return new Response(null, {
    status: 204,
  });
}
