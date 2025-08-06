import type { APIRoute } from 'astro';
import { MessagesService } from '../../../../lib/services/messages.js';
import type { MessageSortField, MessageSortDirection } from '../../../../lib/types/cursor.js';

/**
 * API endpoint for cursor-based message pagination.
 * GET /api/v1/messages/cursor
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const cursor = searchParams.get('cursor') || undefined;
    const sortField = (searchParams.get('sortField') || 'createdAt') as MessageSortField;
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as MessageSortDirection;

    // Validate sort parameters
    const validSortFields: MessageSortField[] = ['createdAt', 'model', 'totalTokens', 'responseTime'];
    const validSortDirections: MessageSortDirection[] = ['asc', 'desc'];

    const finalSortField = validSortFields.includes(sortField) ? sortField : 'createdAt';
    const finalSortDirection = validSortDirections.includes(sortDirection) ? sortDirection : 'desc';

    // Get messages using cursor pagination
    const result = await MessagesService.getMessagesCursor({
      limit,
      cursor,
      sort: {
        field: finalSortField,
        direction: finalSortDirection,
      },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in cursor pagination endpoint:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to retrieve messages',
        message: error instanceof Error ? error.message : 'Unknown error',
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