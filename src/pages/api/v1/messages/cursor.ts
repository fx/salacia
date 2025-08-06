import type { APIRoute } from 'astro';
import { MessagesService } from '../../../../lib/services/messages.js';
import type {
  MessagesCursorPaginationParams,
  MessagesCursorPaginationResponse,
} from '../../../../lib/types/cursor.js';
import type { MessagesFilterParams, MessageDisplay } from '../../../../lib/types/messages.js';

/**
 * GET /api/v1/messages/cursor - Retrieves messages using cursor-based pagination.
 *
 * Query Parameters:
 * - limit: Maximum number of items to return (1-100, default: 20)
 * - cursor: Encoded cursor string for pagination
 * - sortBy: Field to sort by ('createdAt' or 'id', default: 'createdAt')
 * - sortDirection: Sort direction ('asc' or 'desc', default: 'desc')
 * - model: Filter by model name
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 * - hasError: Filter by error status
 * - minTokens: Filter by minimum token count
 * - maxTokens: Filter by maximum token count
 * - searchTerm: Search in request/response content
 *
 * @returns Cursor-paginated messages with navigation cursors
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse pagination parameters
    const params: MessagesCursorPaginationParams = {
      limit: parseInt(url.searchParams.get('limit') || '20'),
      cursor: url.searchParams.get('cursor') || undefined,
      sortBy: (url.searchParams.get('sortBy') as 'createdAt' | 'id') || 'createdAt',
      sortDirection: (url.searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
    };

    // Validate limit
    if (!params.limit || params.limit < 1 || params.limit > 100) {
      return new Response(JSON.stringify({ error: 'Invalid limit parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse filter parameters
    const filters: MessagesFilterParams = {};

    const model = url.searchParams.get('model');
    if (model) filters.model = model;

    const startDate = url.searchParams.get('startDate');
    if (startDate) filters.startDate = new Date(startDate);

    const endDate = url.searchParams.get('endDate');
    if (endDate) filters.endDate = new Date(endDate);

    const hasError = url.searchParams.get('hasError');
    if (hasError !== null) filters.hasError = hasError === 'true';

    const minTokens = url.searchParams.get('minTokens');
    if (minTokens) filters.minTokens = parseInt(minTokens);

    const maxTokens = url.searchParams.get('maxTokens');
    if (maxTokens) filters.maxTokens = parseInt(maxTokens);

    const searchTerm = url.searchParams.get('searchTerm');
    if (searchTerm) filters.searchTerm = searchTerm;

    // Fetch messages with cursor pagination
    const result: MessagesCursorPaginationResponse<MessageDisplay> =
      await MessagesService.getMessagesWithCursor(params, filters);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching messages with cursor:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to retrieve messages',
        message: 'An error occurred while processing your request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
