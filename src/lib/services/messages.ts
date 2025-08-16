import { Op, fn, col, literal, where } from 'sequelize';
import type {
  MessageDisplay,
  MessageStats,
  MessagesFilterParams,
  MessagesPaginationParams,
  MessagesPaginatedResult,
  MessageSort,
} from '../types/messages.js';
import { transformAiInteractionToDisplay } from '../types/messages.js';
import type { AiInteractionData } from '../types/messages.js';
import { AiInteraction, AiProvider } from '../db/models/index.js';
import type {
  MessagesCursorPaginationParams,
  MessagesCursorPaginationResponse,
} from '../types/cursor.js';
import { CursorUtils } from '../types/cursor.js';

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

      const result = await AiInteraction.findByPk(id, {
        include: [
          {
            model: AiProvider,
            as: 'provider',
            attributes: ['id', 'name', 'type'],
          },
        ],
      });

      if (!result) {
        return null;
      }

      return transformAiInteractionToDisplay(result.toJSON() as AiInteractionData);
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
      const order: Array<[string, string]> = this.buildOrderBy(params.sort);

      // Calculate offset for pagination
      const offset = (params.page - 1) * params.pageSize;

      // Execute queries in parallel for better performance
      const [messagesResult, totalItems, statsResult] = await Promise.all([
        // Main query for paginated messages
        AiInteraction.findAll({
          where: whereConditions,
          order: order,
          limit: params.pageSize,
          offset: offset,
          include: [
            {
              model: AiProvider,
              as: 'provider',
              attributes: ['id', 'name', 'type'],
            },
          ],
        }),

        // Count query for total items
        AiInteraction.count({ where: whereConditions }),

        // Statistics query for aggregated data
        this.getFilteredStats(filters),
      ]);

      const totalPages = Math.ceil(totalItems / params.pageSize);

      // Transform database records to display format
      const messages = messagesResult.map(interaction =>
        transformAiInteractionToDisplay(interaction.toJSON() as AiInteractionData)
      );

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
        AiInteraction.findAll({
          attributes: [
            [fn('COUNT', col('*')), 'totalMessages'],
            [literal('COUNT(CASE WHEN error IS NOT NULL THEN 1 END)'), 'failedMessages'],
            [fn('COALESCE', fn('SUM', col('total_tokens')), 0), 'totalTokens'],
            [fn('COALESCE', fn('AVG', col('response_time_ms')), 0), 'averageResponseTime'],
          ],
          where: whereConditions,
          raw: true,
        }),

        // Model usage statistics
        AiInteraction.findAll({
          attributes: ['model', [fn('COUNT', col('*')), 'count']],
          where: whereConditions,
          group: ['model'],
          order: [[literal('count'), 'DESC']],
          limit: 1,
          raw: true,
        }),
      ]);

      const stats = statsResult[0] as unknown as Record<string, unknown>;
      const mostUsedModelResult = modelStatsResult[0] as unknown as Record<string, unknown>;

      // Calculate successful messages
      const successfulMessages =
        Number(stats?.totalMessages || 0) - Number(stats?.failedMessages || 0);

      // Calculate derived metrics
      const totalMessages = Number(stats?.totalMessages || 0);
      const successRate =
        totalMessages > 0 ? Math.round((successfulMessages / totalMessages) * 100) : 0;

      // Count unique models
      const uniqueModelsResult = await AiInteraction.findAll({
        attributes: [[fn('COUNT', fn('DISTINCT', col('model'))), 'uniqueModels']],
        where: whereConditions,
        raw: true,
      });

      return {
        totalMessages,
        successfulMessages,
        failedMessages: Number(stats?.failedMessages || 0),
        successRate,
        totalTokens: Number(stats?.totalTokens || 0),
        averageResponseTime: Math.round(Number(stats?.averageResponseTime || 0)),
        mostUsedModel: mostUsedModelResult?.model as string | undefined,
        uniqueModels: Number(
          (uniqueModelsResult[0] as unknown as Record<string, unknown>)?.uniqueModels || 0
        ),
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
   * @param filters - Filtering parameters to convert to Sequelize conditions
   * @returns Combined WHERE condition for use in Sequelize queries
   * @private
   */
  private static buildWhereConditions(filters: MessagesFilterParams) {
    const conditions: Record<string, unknown> = {};

    // Model filtering
    if (filters.model) {
      conditions.model = filters.model;
    }

    // Date range filtering
    const dateConditions: Record<symbol, Date> = {};
    if (filters.startDate) {
      dateConditions[Op.gte] = filters.startDate;
    }
    if (filters.endDate) {
      dateConditions[Op.lte] = filters.endDate;
    }
    // Use Object.getOwnPropertySymbols to check for Sequelize operator symbols (e.g., Op.lte, Op.gte)
    if (Object.getOwnPropertySymbols(dateConditions).length > 0) {
      conditions.createdAt = dateConditions;
    }

    // Error status filtering
    if (filters.hasError === true) {
      conditions.error = { [Op.not]: null };
    } else if (filters.hasError === false) {
      conditions.error = null;
    }

    // Token count filtering
    const tokenConditions: Record<symbol, number> = {};
    if (filters.minTokens !== undefined) {
      tokenConditions[Op.gte] = filters.minTokens;
    }
    if (filters.maxTokens !== undefined) {
      tokenConditions[Op.lte] = filters.maxTokens;
    }
    if (Object.keys(tokenConditions).length > 0) {
      conditions.totalTokens = tokenConditions;
    }

    // Response time filtering
    const responseTimeConditions: Record<symbol, number> = {};
    if (filters.minResponseTime !== undefined) {
      responseTimeConditions[Op.gte] = filters.minResponseTime;
    }
    if (filters.maxResponseTime !== undefined) {
      responseTimeConditions[Op.lte] = filters.maxResponseTime;
    }
    if (Object.keys(responseTimeConditions).length > 0) {
      conditions.responseTimeMs = responseTimeConditions;
    }

    // Search term filtering (searches in request and response JSON)
    if (filters.searchTerm) {
      const searchPattern = `%${filters.searchTerm}%`;
      (conditions as Record<string | symbol, unknown>)[Op.or] = [
        where(fn('CAST', col('request'), 'TEXT'), Op.iLike, searchPattern),
        where(fn('CAST', col('response'), 'TEXT'), Op.iLike, searchPattern),
      ];
    }

    return conditions;
  }

  /**
   * Builds ORDER BY clauses for sorting queries based on sort configuration.
   *
   * @param sort - Sort configuration specifying field and direction
   * @returns Array of order by clauses for use in Sequelize queries
   * @private
   */
  private static buildOrderBy(sort: MessageSort): Array<[string, string]> {
    const { field, direction } = sort;

    // Map sort fields to database columns
    switch (field) {
      case 'createdAt':
        return [['createdAt', direction.toUpperCase()]];
      case 'model':
        return [['model', direction.toUpperCase()]];
      case 'totalTokens':
        return [['totalTokens', direction.toUpperCase()]];
      case 'responseTime':
        return [['responseTimeMs', direction.toUpperCase()]];
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

  /**
   * Retrieves messages using cursor-based pagination for efficient large dataset navigation.
   *
   * @param params - Cursor pagination parameters
   * @param filters - Optional filtering criteria
   * @returns Promise resolving to cursor-paginated response
   * @throws Error if pagination fails or parameters are invalid
   */
  static async getMessagesWithCursor(
    params: MessagesCursorPaginationParams,
    filters: MessagesFilterParams = {}
  ): Promise<MessagesCursorPaginationResponse<MessageDisplay>> {
    const limit = Math.min(params.limit || 20, 100);
    const sortBy = params.sortBy || 'createdAt';
    const sortDirection = params.sortDirection || 'desc';

    try {
      const whereConditions: Record<string, unknown> = this.buildWhereConditions(filters);

      // Add cursor conditions if cursor provided
      if (params.cursor && CursorUtils.isValid(params.cursor)) {
        const cursorData = CursorUtils.decode(params.cursor);
        if (cursorData) {
          // Build cursor comparison based on sort field
          if (sortBy === 'createdAt') {
            const cursorDate = new Date(cursorData.sortFieldValue);
            if (sortDirection === 'desc') {
              (whereConditions as Record<string | symbol, unknown>)[Op.or] = [
                { createdAt: { [Op.lt]: cursorDate } },
                {
                  [Op.and]: [{ createdAt: cursorDate }, { id: { [Op.lt]: cursorData.id } }],
                },
              ];
            } else {
              (whereConditions as Record<string | symbol, unknown>)[Op.or] = [
                { createdAt: { [Op.gt]: cursorDate } },
                {
                  [Op.and]: [{ createdAt: cursorDate }, { id: { [Op.gt]: cursorData.id } }],
                },
              ];
            }
          } else if (sortBy === 'id') {
            if (sortDirection === 'desc') {
              whereConditions.id = { [Op.lt]: cursorData.id };
            } else {
              whereConditions.id = { [Op.gt]: cursorData.id };
            }
          }
        }
      }

      // Build order by
      const order: [string, string][] = [];
      if (sortBy === 'createdAt') {
        order.push(['createdAt', sortDirection.toUpperCase()]);
      }
      order.push(['id', sortDirection.toUpperCase()]);

      // For bidirectional cursor navigation, we need to check if there are items before and after
      // First, get the main results plus one extra to check hasMore
      const results = await AiInteraction.findAll({
        where: whereConditions,
        order: order,
        limit: limit + 1,
        include: [
          {
            model: AiProvider,
            as: 'provider',
            attributes: ['id', 'name', 'type'],
          },
        ],
      });

      const hasMore = results.length > limit;
      const items = results
        .slice(0, limit)
        .map(interaction =>
          transformAiInteractionToDisplay(interaction.toJSON() as AiInteractionData)
        );

      // Generate cursors
      let nextCursor: string | undefined;
      let prevCursor: string | undefined;

      // Generate next cursor if there are more items
      if (hasMore && items.length > 0) {
        const lastItem = items[items.length - 1];
        const sortValue = sortBy === 'createdAt' ? lastItem.createdAt : lastItem.id;
        nextCursor = CursorUtils.encode(sortValue, lastItem.id, sortBy);
      }

      // Generate previous cursor if we're not on the first page
      // We can determine this by checking if we have a cursor parameter
      if (params.cursor && items.length > 0) {
        const firstItem = items[0];

        // Build reverse query conditions to check for previous items
        const reverseWhereConditions = this.buildWhereConditions(filters);

        // Add reverse cursor conditions
        if (sortBy === 'createdAt') {
          const firstItemDate = firstItem.createdAt;
          if (sortDirection === 'desc') {
            // For desc order, previous items have createdAt > current first item
            (reverseWhereConditions as Record<string | symbol, unknown>)[Op.or] = [
              { createdAt: { [Op.gt]: firstItemDate } },
              {
                [Op.and]: [{ createdAt: firstItemDate }, { id: { [Op.gt]: firstItem.id } }],
              },
            ];
          } else {
            // For asc order, previous items have createdAt < current first item
            (reverseWhereConditions as Record<string | symbol, unknown>)[Op.or] = [
              { createdAt: { [Op.lt]: firstItemDate } },
              {
                [Op.and]: [{ createdAt: firstItemDate }, { id: { [Op.lt]: firstItem.id } }],
              },
            ];
          }
        } else if (sortBy === 'id') {
          if (sortDirection === 'desc') {
            reverseWhereConditions.id = { [Op.gt]: firstItem.id };
          } else {
            reverseWhereConditions.id = { [Op.lt]: firstItem.id };
          }
        }

        // Check if there are previous items
        const previousExists = await AiInteraction.findOne({
          where: reverseWhereConditions,
          attributes: ['id'],
        });

        if (previousExists) {
          // Create a cursor that when used will return the previous page
          // This is done by creating a cursor from the first item of current page
          const sortValue = sortBy === 'createdAt' ? firstItem.createdAt : firstItem.id;
          prevCursor = CursorUtils.encode(sortValue, firstItem.id, sortBy);
        }
      }

      return {
        data: items,
        meta: {
          count: items.length,
          limit,
          hasMore,
          sortBy,
          sortDirection,
        },
        cursors: {
          next: nextCursor,
          prev: prevCursor,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve messages with cursor: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
