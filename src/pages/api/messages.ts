import type { APIRoute } from 'astro';
import { MessagesService } from '../../lib/services/messages.js';
import type {
  MessagesCursorPaginationParams,
  MessagesCursorPaginationResponse,
} from '../../lib/types/cursor.js';
import type { MessagesFilterParams, MessageDisplay } from '../../lib/types/messages.js';
import { createLogger } from '../../lib/utils/logger.js';
import { classifyMessagesServiceError, createErrorResponse } from '../../lib/errors/api-errors.js';

const logger = createLogger('API/Messages');

/**
 * Messages API endpoint for retrieving cursor-paginated AI interaction messages.
 *
 * This endpoint provides access to the messages database with support for:
 * - Cursor-based pagination for efficient large dataset navigation
 * - Sorting (sortBy, sortDirection)
 * - Filtering (model, dateRange, hasError, tokens, searchTerm)
 *
 * Query Parameters:
 * - limit: Maximum number of items to return (1-100, default: 20)
 * - cursor: Encoded cursor string for pagination
 * - sortBy: Field to sort by ('createdAt' or 'id', default: 'createdAt')
 * - sortDirection: Sort direction ('asc' or 'desc', default: 'desc')
 * - model: Filter by AI model name
 * - startDate: Filter by start date (YYYY-MM-DD)
 * - endDate: Filter by end date (YYYY-MM-DD)
 * - hasError: Filter by error status (true, false)
 * - minTokens: Minimum token count
 * - maxTokens: Maximum token count
 * - searchTerm: Search term for content matching
 *
 * @returns JSON response with cursor-paginated messages and navigation cursors
 */
export const GET: APIRoute = async ({ url }) => {
  const startTime = Date.now();

  try {
    // Parse pagination parameters
    const params: MessagesCursorPaginationParams = {
      limit: parseInt(url.searchParams.get('limit') || '20'),
      cursor: url.searchParams.get('cursor') || undefined,
      sortBy: (url.searchParams.get('sortBy') as 'createdAt' | 'id') || 'createdAt',
      sortDirection: (url.searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
    };

    // Validate limit
    if (!params.limit || Number.isNaN(params.limit) || params.limit < 1 || params.limit > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid limit parameter. Must be a number between 1 and 100.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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

    logger.debug('Messages API request:', {
      params,
      filters,
    });

    // Fetch messages using cursor pagination
    const result: MessagesCursorPaginationResponse<MessageDisplay> =
      await MessagesService.getMessagesWithCursor(params, filters);

    const responseTime = Date.now() - startTime;

    // Simplify response structure for frontend
    const response = {
      items: result.data,
      hasMore: result.meta.hasMore,
      nextCursor: result.cursors.next,
      prevCursor: result.cursors.prev,
    };

    logger.debug('Messages API response:', {
      itemCount: response.items.length,
      hasMore: response.hasMore,
      responseTime,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Messages API error:', error);

    // Classify the error and create appropriate response
    const apiError = classifyMessagesServiceError(error, 'retrieve messages');
    return createErrorResponse(apiError, responseTime);
  }
};
