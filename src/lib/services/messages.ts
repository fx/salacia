import { desc, asc, and, or, gte, lte, like, isNull, isNotNull, count, sql } from 'drizzle-orm';
import type {
  MessageDisplay,
  MessageStats,
  MessagesFilterParams,
  MessagesPaginationParams,
  MessagesPaginatedResult,
  MessagesCursorPaginationParams,
  MessagesCursorPaginatedResult,
  MessageSort,
} from '../types/messages.js';
import { transformAiInteractionToDisplay, CursorUtils } from '../types/messages.js';
import { aiInteractions } from '../db/schema.js';
import { db } from '../db/connection.js';

/**
 * Service class for managing AI message interactions.
 *
 * Provides comprehensive database operations for retrieving, filtering, and analyzing
 * AI interaction data with support for pagination, sorting, and statistical aggregation.
 * All methods include proper error handling and type safety.
 */
export class MessagesService {
  /**
   * Retrieves a single AI interaction message by its unique identifier.
   *
   * @param id - The UUID of the AI interaction to retrieve
   * @returns Promise resolving to the message display object or null if not found
   * @throws Error if the database query fails
   */
  static async getMessageById(id: string): Promise<MessageDisplay | null> {
    try {
      // Validate UUID format before database query
      if (!this.isValidUUID(id)) {
        throw new Error(`Invalid UUID format: ${id}`);
      }

      const result = await db
        .select()
        .from(aiInteractions)
        .where(sql`${aiInteractions.id} = ${id}::text::uuid`)
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return transformAiInteractionToDisplay(result[0]);
    } catch (error) {
      throw new Error(
        `Failed to retrieve message by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves a paginated list of AI interaction messages with filtering and sorting.
   *
   * @param params - Pagination parameters including page, pageSize, and sort configuration
   * @param filters - Optional filtering criteria to narrow down results
   * @returns Promise resolving to paginated result with messages and metadata
   * @throws Error if pagination parameters are invalid or database query fails
   */
  static async getMessages(
    params: MessagesPaginationParams,
    filters: MessagesFilterParams = {}
  ): Promise<MessagesPaginatedResult> {
    // Validate pagination parameters
    if (params.page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (params.pageSize < 1 || params.pageSize > 100) {
      throw new Error('Page size must be between 1 and 100');
    }

    try {
      const whereConditions = this.buildWhereConditions(filters);
      const orderBy = this.buildOrderBy(params.sort);

      // Calculate offset for pagination
      const offset = (params.page - 1) * params.pageSize;

      // Execute queries in parallel for better performance
      const [messagesResult, countResult, statsResult] = await Promise.all([
        // Main query for paginated messages
        db
          .select()
          .from(aiInteractions)
          .where(whereConditions)
          .orderBy(...orderBy)
          .limit(params.pageSize)
          .offset(offset),

        // Count query for total items
        db.select({ count: count() }).from(aiInteractions).where(whereConditions),

        // Statistics query for aggregated data
        this.getFilteredStats(filters),
      ]);

      const totalItems = countResult[0]?.count ?? 0;
      const totalPages = Math.ceil(totalItems / params.pageSize);

      // Transform database records to display format
      const messages = messagesResult.map(transformAiInteractionToDisplay);

      return {
        messages,
        currentPage: params.page,
        pageSize: params.pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: params.page > 1,
        hasNextPage: params.page < totalPages,
        sort: params.sort,
        filters,
        stats: statsResult,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves messages using cursor-based pagination for efficient real-time updates.
   *
   * @param params - Cursor pagination parameters including limit, cursor, and sort configuration
   * @param filters - Optional filtering criteria to narrow down results
   * @returns Promise resolving to cursor-paginated result with messages and metadata
   * @throws Error if pagination parameters are invalid or database query fails
   */
  static async getMessagesCursor(
    params: MessagesCursorPaginationParams,
    filters: MessagesFilterParams = {}
  ): Promise<MessagesCursorPaginatedResult> {
    // Validate cursor pagination parameters
    if (params.limit < 1 || params.limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    try {
      const whereConditions = [];

      // Add filter conditions
      const filterConditions = this.buildWhereConditions(filters);
      if (filterConditions) {
        whereConditions.push(filterConditions);
      }

      // Add cursor conditions if provided
      if (params.cursor) {
        const cursorData = CursorUtils.decode(params.cursor);
        if (!cursorData) {
          throw new Error('Invalid cursor format');
        }

        const cursorDate = new Date(cursorData.timestamp);

        // For cursor pagination with newest first (desc), we want records older than the cursor
        if (params.sort.direction === 'desc') {
          whereConditions.push(
            or(
              // Records with older timestamp
              sql`${aiInteractions.createdAt} < ${cursorDate}`,
              // Records with same timestamp but lexicographically smaller ID
              and(
                sql`${aiInteractions.createdAt} = ${cursorDate}`,
                sql`${aiInteractions.id} < ${cursorData.id}`
              )
            )
          );
        } else {
          // For asc order, we want records newer than the cursor
          whereConditions.push(
            or(
              // Records with newer timestamp
              sql`${aiInteractions.createdAt} > ${cursorDate}`,
              // Records with same timestamp but lexicographically larger ID
              and(
                sql`${aiInteractions.createdAt} = ${cursorDate}`,
                sql`${aiInteractions.id} > ${cursorData.id}`
              )
            )
          );
        }
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const orderBy = this.buildOrderBy(params.sort);

      // Query one extra record to determine if there are more pages
      const queryLimit = params.limit + 1;

      // Execute queries in parallel
      const [messagesResult, statsResult] = await Promise.all([
        // Main cursor query
        db
          .select()
          .from(aiInteractions)
          .where(whereClause)
          .orderBy(...orderBy)
          .limit(queryLimit),

        // Statistics query for aggregated data
        this.getFilteredStats(filters),
      ]);

      // Check if there are more results
      const hasMore = messagesResult.length > params.limit;
      const messages = hasMore ? messagesResult.slice(0, params.limit) : messagesResult;

      // Generate next cursor if there are more results
      let nextCursor: string | undefined;
      if (hasMore && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        nextCursor = CursorUtils.encode(lastMessage.createdAt, lastMessage.id);
      }

      // Transform database records to display format
      const displayMessages = messages.map(transformAiInteractionToDisplay);

      return {
        messages: displayMessages,
        limit: params.limit,
        nextCursor,
        hasMore,
        sort: params.sort,
        filters,
        stats: statsResult,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve messages with cursor: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves aggregated statistics for AI interactions with optional filtering.
   *
   * @param filters - Optional filtering criteria to apply to statistics calculation
   * @returns Promise resolving to aggregated statistics object
   * @throws Error if the database query fails
   */
  static async getFilteredStats(filters: MessagesFilterParams = {}): Promise<MessageStats> {
    try {
      const whereConditions = this.buildWhereConditions(filters);

      // Execute aggregation queries
      const [statsResult, modelStatsResult] = await Promise.all([
        // Main statistics aggregation
        db
          .select({
            totalMessages: count(),
            successfulMessages: count(sql`CASE WHEN ${aiInteractions.error} IS NULL THEN 1 END`),
            failedMessages: count(sql`CASE WHEN ${aiInteractions.error} IS NOT NULL THEN 1 END`),
            totalTokens: sql<number>`COALESCE(SUM(${aiInteractions.totalTokens}), 0)::integer`,
            averageResponseTime: sql<number>`COALESCE(AVG(${aiInteractions.responseTimeMs}), 0)::integer`,
          })
          .from(aiInteractions)
          .where(whereConditions),

        // Model usage statistics
        db
          .select({
            model: aiInteractions.model,
            count: count(),
          })
          .from(aiInteractions)
          .where(whereConditions)
          .groupBy(aiInteractions.model)
          .orderBy(desc(count()))
          .limit(1),
      ]);

      const stats = statsResult[0];
      const mostUsedModelResult = modelStatsResult[0];

      // Calculate derived metrics
      const successRate =
        stats?.totalMessages > 0
          ? Math.round((stats.successfulMessages / stats.totalMessages) * 100)
          : 0;

      // Count unique models
      const uniqueModelsResult = await db
        .select({ model: aiInteractions.model })
        .from(aiInteractions)
        .where(whereConditions)
        .groupBy(aiInteractions.model);

      return {
        totalMessages: stats?.totalMessages ?? 0,
        successfulMessages: stats?.successfulMessages ?? 0,
        failedMessages: stats?.failedMessages ?? 0,
        successRate,
        totalTokens: stats?.totalTokens ?? 0,
        averageResponseTime: stats?.averageResponseTime ?? 0,
        mostUsedModel: mostUsedModelResult?.model,
        uniqueModels: uniqueModelsResult.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Builds WHERE conditions for filtering queries based on provided filter parameters.
   *
   * @param filters - Filtering parameters to convert to SQL conditions
   * @returns Combined WHERE condition for use in Drizzle queries
   * @private
   */
  private static buildWhereConditions(filters: MessagesFilterParams) {
    const conditions = [];

    // Model filtering
    if (filters.model) {
      conditions.push(sql`${aiInteractions.model} = ${filters.model}`);
    }

    // Date range filtering
    if (filters.startDate) {
      conditions.push(gte(aiInteractions.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(aiInteractions.createdAt, filters.endDate));
    }

    // Error status filtering
    if (filters.hasError === true) {
      conditions.push(isNotNull(aiInteractions.error));
    } else if (filters.hasError === false) {
      conditions.push(isNull(aiInteractions.error));
    }

    // Token count filtering
    if (filters.minTokens !== undefined) {
      conditions.push(gte(aiInteractions.totalTokens, filters.minTokens));
    }
    if (filters.maxTokens !== undefined) {
      conditions.push(lte(aiInteractions.totalTokens, filters.maxTokens));
    }

    // Response time filtering
    if (filters.minResponseTime !== undefined) {
      conditions.push(gte(aiInteractions.responseTimeMs, filters.minResponseTime));
    }
    if (filters.maxResponseTime !== undefined) {
      conditions.push(lte(aiInteractions.responseTimeMs, filters.maxResponseTime));
    }

    // Search term filtering (searches in request and response JSON)
    if (filters.searchTerm) {
      const searchPattern = `%${filters.searchTerm}%`;
      conditions.push(
        or(
          like(sql`${aiInteractions.request}::text`, searchPattern),
          like(sql`${aiInteractions.response}::text`, searchPattern)
        )
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Builds ORDER BY clauses for sorting queries based on sort configuration.
   *
   * @param sort - Sort configuration specifying field and direction
   * @returns Array of order by clauses for use in Drizzle queries
   * @private
   */
  private static buildOrderBy(sort: MessageSort) {
    const { field, direction } = sort;
    const orderFunc = direction === 'asc' ? asc : desc;

    // Map sort fields to database columns
    switch (field) {
      case 'createdAt':
        return [orderFunc(aiInteractions.createdAt)];
      case 'model':
        return [orderFunc(aiInteractions.model)];
      case 'totalTokens':
        return [orderFunc(aiInteractions.totalTokens)];
      case 'responseTime':
        return [orderFunc(aiInteractions.responseTimeMs)];
      default:
        throw new Error(`Invalid sort field: ${field}`);
    }
  }

  /**
   * Validates UUID format for safe database operations.
   *
   * @param id - String to validate as UUID
   * @returns True if the string is a valid UUID format
   * @private
   */
  private static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
