import type { APIRoute } from 'astro';
import { MessagesService } from '../../../../lib/services/messages.js';
import {
  parseUrlCursorPaginationParams,
  parseUrlFilterParams,
} from '../../../../lib/utils/pagination.js';
import { createLogger } from '../../../../lib/utils/logger.js';
import {
  classifyMessagesServiceError,
  createErrorResponse,
} from '../../../../lib/errors/api-errors.js';

const logger = createLogger('API/Messages/Cursor');

/**
 * Cursor-based Messages API endpoint for efficient pagination and real-time updates.
 *
 * This endpoint provides access to the messages database with cursor-based pagination:
 * - Efficient pagination for large datasets
 * - Optimized for real-time updates (newest messages first)
 * - Consistent results even when new messages are added
 * - No page count or total calculation overhead
 *
 * Query Parameters:
 * - limit: Number of items to return (default: 100, max: 100)
 * - cursor: Pagination cursor (base64 encoded timestamp+id)
 * - sortField: Field to sort by (createdAt, model, totalTokens, responseTime)
 * - sortDirection: Sort direction (asc, desc - default: desc for newest first)
 * - model: Filter by AI model name
 * - provider: Filter by provider name
 * - startDate: Filter by start date (YYYY-MM-DD)
 * - endDate: Filter by end date (YYYY-MM-DD)
 * - hasError: Filter by error status (true, false)
 * - minTokens: Minimum token count
 * - maxTokens: Maximum token count
 * - minResponseTime: Minimum response time in ms
 * - maxResponseTime: Maximum response time in ms
 * - searchTerm: Search term for content matching
 *
 * @returns JSON response with cursor-paginated messages and metadata
 */
export const GET: APIRoute = async ({ url }) => {
  const startTime = Date.now();

  try {
    const searchParams = new URLSearchParams(url.search);

    // Parse cursor pagination and filter parameters from URL
    const cursorPaginationParams = parseUrlCursorPaginationParams(searchParams);
    const filterParams = parseUrlFilterParams(searchParams);

    logger.debug('Cursor Messages API request:', {
      pagination: cursorPaginationParams,
      filters: filterParams,
    });

    // Fetch messages using the cursor-based service method
    const result = await MessagesService.getMessagesCursor(cursorPaginationParams, filterParams);

    const responseTime = Date.now() - startTime;

    logger.debug('Cursor Messages API response:', {
      messageCount: result.messages.length,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor ? 'present' : 'none',
      responseTime,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
        'X-Has-More': result.hasMore.toString(),
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Cursor Messages API error:', error);

    // Classify the error and create appropriate response
    const apiError = classifyMessagesServiceError(error, 'retrieve messages with cursor');
    return createErrorResponse(apiError, responseTime);
  }
};
