/**
 * API endpoint for cursor-based pagination of AI interaction messages.
 * Provides efficient message retrieval with proper error handling.
 */

import type { APIRoute } from 'astro';
import { MessagesService } from '../../../../lib/services/MessagesService.js';
import type { CursorPaginationRequest } from '../../../../lib/types/pagination.js';

/**
 * GET /api/v1/messages/cursor - Retrieve messages with cursor pagination
 *
 * Query Parameters:
 * - limit: number (1-100, default: 50) - Number of messages to retrieve
 * - cursor: string - Cursor for pagination
 * - sortBy: 'createdAt' | 'model' | 'totalTokens' | 'responseTime' (default: 'createdAt')
 * - sortDirection: 'asc' | 'desc' (default: 'desc')
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Extract and parse query parameters
    const params: CursorPaginationRequest = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      cursor: searchParams.get('cursor') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || undefined,
      sortDirection: (searchParams.get('sortDirection') as any) || undefined,
    };

    // Validate numeric parameters
    if (
      params.limit !== undefined &&
      (isNaN(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      return new Response(
        JSON.stringify({
          error: 'Invalid limit parameter. Must be a number between 1 and 100.',
          code: 'INVALID_LIMIT',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Initialize service and fetch messages
    const messagesService = new MessagesService();
    const result = await messagesService.getMessages(params);

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in messages cursor API:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('Invalid')) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: 'VALIDATION_ERROR',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle database errors
    if (
      error instanceof Error &&
      (error.message.includes('database') ||
        error.message.includes('connection') ||
        error.message.includes('query'))
    ) {
      return new Response(
        JSON.stringify({
          error: 'Database error occurred while fetching messages.',
          code: 'DATABASE_ERROR',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle unknown errors
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred.',
        code: 'INTERNAL_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
