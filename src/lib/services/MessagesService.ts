/**
 * MessagesService - Handles cursor-based pagination for AI interactions.
 * Provides efficient querying with proper SQL generation and security.
 */

import { eq, gt, lt, asc, desc, and, or, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { aiInteractions, type AiInteraction } from '../db/schema.js';
import type {
  CursorPaginationRequest,
  CursorPaginationResponse,
  SortField,
  SortDirection,
} from '../types/pagination.js';
import { validatePaginationParams, encodeCursor, createCursor } from '../utils/cursor.js';

/**
 * Service class for handling AI interaction message queries with cursor pagination.
 */
export class MessagesService {
  /**
   * Retrieves AI interactions using cursor-based pagination.
   * @param params Pagination parameters
   * @returns Paginated response with messages and cursor metadata
   */
  async getMessages(
    params: CursorPaginationRequest
  ): Promise<CursorPaginationResponse<AiInteraction>> {
    const validatedParams = validatePaginationParams(params);
    const { limit, sortBy, sortDirection, cursor } = validatedParams;

    // Build the query with proper sorting and filtering
    const query = this.buildQuery(sortBy, sortDirection, cursor, limit + 1);

    // Execute query
    const results = await query;

    // Determine if there are more results
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    // Create pagination metadata
    const pagination = await this.createPaginationMetadata(
      items,
      sortBy,
      sortDirection,
      hasMore,
      cursor
    );

    return {
      data: items,
      pagination,
    };
  }

  /**
   * Builds the database query with cursor-based filtering and sorting.
   * @param sortBy Field to sort by
   * @param sortDirection Sort direction
   * @param cursor Current cursor position
   * @param limit Query limit
   * @returns Drizzle query builder
   */
  private buildQuery(
    sortBy: SortField,
    sortDirection: SortDirection,
    cursor?: any,
    limit?: number
  ) {
    let queryBuilder = db.select().from(aiInteractions);

    // Apply cursor filtering if provided
    if (cursor) {
      const cursorCondition = this.buildCursorCondition(sortBy, sortDirection, cursor);
      queryBuilder = queryBuilder.where(cursorCondition) as any;
    }

    // Apply sorting
    const orderByClause = this.buildOrderByClause(sortBy, sortDirection);
    queryBuilder = queryBuilder.orderBy(...orderByClause) as any;

    // Apply limit
    if (limit) {
      queryBuilder = queryBuilder.limit(limit) as any;
    }

    return queryBuilder;
  }

  /**
   * Builds cursor filtering condition for the query.
   * @param sortBy Sort field
   * @param sortDirection Sort direction
   * @param cursor Cursor data
   * @returns SQL condition for cursor filtering
   */
  private buildCursorCondition(sortBy: SortField, sortDirection: SortDirection, cursor: any): SQL {
    const field = this.getFieldColumn(sortBy);
    const isAscending = sortDirection === 'asc';
    const cursorValue = cursor.value;
    const cursorId = cursor.id;

    // For cursor pagination, we need to handle ties in the sort field
    // by also comparing the ID field
    if (isAscending) {
      // For ascending sort: field > cursor_value OR (field = cursor_value AND id > cursor_id)
      return or(
        gt(field, cursorValue),
        and(eq(field, cursorValue), gt(aiInteractions.id, cursorId))
      )!;
    } else {
      // For descending sort: field < cursor_value OR (field = cursor_value AND id > cursor_id)
      return or(
        lt(field, cursorValue),
        and(eq(field, cursorValue), gt(aiInteractions.id, cursorId))
      )!;
    }
  }

  /**
   * Builds ORDER BY clause for the query.
   * @param sortBy Sort field
   * @param sortDirection Sort direction
   * @returns Array of order by expressions
   */
  private buildOrderByClause(sortBy: SortField, sortDirection: SortDirection) {
    const field = this.getFieldColumn(sortBy);
    const sortFn = sortDirection === 'asc' ? asc : desc;

    // Always include ID as secondary sort for consistent ordering
    return [sortFn(field), asc(aiInteractions.id)];
  }

  /**
   * Gets the database column for a sort field.
   * @param sortBy Sort field name
   * @returns Database column reference
   */
  private getFieldColumn(sortBy: SortField) {
    switch (sortBy) {
      case 'createdAt':
        return aiInteractions.createdAt;
      case 'model':
        return aiInteractions.model;
      case 'totalTokens':
        return aiInteractions.totalTokens;
      case 'responseTime':
        return aiInteractions.responseTime;
      default:
        throw new Error(`Unsupported sort field: ${sortBy}`);
    }
  }

  /**
   * Creates pagination metadata including cursors.
   * @param items Current page items
   * @param sortBy Sort field
   * @param sortDirection Sort direction
   * @param hasMore Whether there are more items
   * @param currentCursor Current cursor
   * @returns Pagination metadata
   */
  private async createPaginationMetadata(
    items: AiInteraction[],
    sortBy: SortField,
    sortDirection: SortDirection,
    hasMore: boolean,
    currentCursor?: any
  ) {
    const count = items.length;
    const hasNext = hasMore;

    // Check if there are previous items by running a reverse query
    let hasPrev = false;
    if (currentCursor) {
      const reverseCursor = {
        ...currentCursor,
        direction: sortDirection === 'asc' ? 'desc' : 'asc',
      };
      const reverseQuery = this.buildQuery(
        sortBy,
        sortDirection === 'asc' ? 'desc' : 'asc',
        reverseCursor,
        1
      );
      const reverseResults = await reverseQuery;
      hasPrev = reverseResults.length > 0;
    }

    // Generate cursors
    let nextCursor: string | undefined;
    let prevCursor: string | undefined;

    if (hasNext && items.length > 0) {
      const lastItem = items[items.length - 1];
      const cursorData = createCursor(lastItem, sortBy, sortDirection);
      nextCursor = encodeCursor(cursorData);
    }

    if (hasPrev && items.length > 0) {
      const firstItem = items[0];
      const cursorData = createCursor(firstItem, sortBy, sortDirection === 'asc' ? 'desc' : 'asc');
      prevCursor = encodeCursor(cursorData);
    }

    return {
      nextCursor,
      prevCursor,
      hasNext,
      hasPrev,
      count,
    };
  }
}
