import type { APIRoute } from 'astro';
import { MessagesService } from '../../lib/services/messages.js';
import { parseUrlPaginationParams, parseUrlFilterParams } from '../../lib/utils/pagination.js';
import { createLogger } from '../../lib/utils/logger.js';
import { classifyMessagesServiceError, createErrorResponse } from '../../lib/errors/api-errors.js';

const logger = createLogger('API/Messages');

/**
 * Messages API endpoint for retrieving paginated AI interaction messages.
 *
 * This endpoint provides access to the messages database with support for:
 * - Pagination (page, pageSize)
 * - Sorting (sortField, sortDirection)
 * - Filtering (model, provider, dateRange, hasError, tokens, responseTime, searchTerm)
 * - Aggregated statistics
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - sortField: Field to sort by (createdAt, model, totalTokens, responseTime)
 * - sortDirection: Sort direction (asc, desc)
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
 * @returns JSON response with paginated messages and metadata
 */
export const GET: APIRoute = async ({ url }) => {
  const startTime = Date.now();

  try {
    const searchParams = new URLSearchParams(url.search);

    // Parse pagination and filter parameters from URL
    const paginationParams = parseUrlPaginationParams(searchParams);
    const filterParams = parseUrlFilterParams(searchParams);

    logger.debug('Messages API request:', {
      pagination: paginationParams,
      filters: filterParams,
    });

    // Fetch messages using the service layer
    const result = await MessagesService.getMessages(paginationParams, filterParams);

    const responseTime = Date.now() - startTime;

    logger.debug('Messages API response:', {
      totalItems: result.totalItems,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      responseTime,
    });

    return new Response(JSON.stringify(result), {
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
