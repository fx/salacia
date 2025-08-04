import { db } from '../db/connection';
import { aiInteractions, type AiInteraction } from '../db/schema';
import { desc, asc, sql, count, and, gte, lte, ilike } from 'drizzle-orm';
import { createLogger } from '../utils/logger';

const logger = createLogger('MessagesService');

/**
 * Pagination parameters for querying messages
 */
export interface MessagesPaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Number of items per page (1-100) */
  limit: number;
}

/**
 * Sorting parameters for messages query
 */
export interface MessagesSortParams {
  /** Field to sort by */
  field: 'createdAt' | 'model' | 'totalTokens' | 'responseTimeMs';
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Filtering parameters for messages query
 */
export interface MessagesFilterParams {
  /** Filter by model name (partial match) */
  model?: string;
  /** Filter by date range - start date */
  dateFrom?: Date;
  /** Filter by date range - end date */
  dateTo?: Date;
  /** Filter by provider ID */
  providerId?: string;
  /** Filter by status code */
  statusCode?: number;
  /** Only show interactions with errors */
  hasError?: boolean;
}

/**
 * Complete query parameters for messages
 */
export interface MessagesQueryParams {
  pagination: MessagesPaginationParams;
  sort: MessagesSortParams;
  filters?: MessagesFilterParams;
}

/**
 * Response structure for paginated messages
 */
export interface MessagesResponse {
  /** Array of AI interactions */
  messages: AiInteraction[];
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Messages service class providing database operations for AI interactions
 */
export class MessagesService {
  /**
   * Retrieves paginated, sorted, and filtered AI interactions
   *
   * @param params - Query parameters for pagination, sorting, and filtering
   * @returns Promise resolving to paginated messages response
   * @throws Error if database query fails
   */
  static async getMessages(params: MessagesQueryParams): Promise<MessagesResponse> {
    try {
      const { pagination, sort, filters } = params;
      
      // Validate pagination parameters
      const safePage = Math.max(1, pagination.page);
      const safeLimit = Math.min(100, Math.max(1, pagination.limit));
      const offset = (safePage - 1) * safeLimit;

      // Build WHERE conditions
      const conditions = [];
      
      if (filters?.model) {
        conditions.push(ilike(aiInteractions.model, `%${filters.model}%`));
      }
      
      if (filters?.dateFrom) {
        conditions.push(gte(aiInteractions.createdAt, filters.dateFrom));
      }
      
      if (filters?.dateTo) {
        conditions.push(lte(aiInteractions.createdAt, filters.dateTo));
      }
      
      if (filters?.providerId) {
        conditions.push(sql`${aiInteractions.providerId} = ${filters.providerId}`);
      }
      
      if (filters?.statusCode) {
        conditions.push(sql`${aiInteractions.statusCode} = ${filters.statusCode}`);
      }
      
      if (filters?.hasError === true) {
        conditions.push(sql`${aiInteractions.error} IS NOT NULL`);
      } else if (filters?.hasError === false) {
        conditions.push(sql`${aiInteractions.error} IS NULL`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build ORDER BY clause
      const sortField = aiInteractions[sort.field];
      const orderBy = sort.direction === 'asc' ? asc(sortField) : desc(sortField);

      // Execute count query
      const [{ total }] = await db
        .select({ total: count() })
        .from(aiInteractions)
        .where(whereClause);

      // Execute main query
      const messages = await db
        .select()
        .from(aiInteractions)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(safeLimit)
        .offset(offset);

      const totalPages = Math.ceil(total / safeLimit);

      logger.debug(`Retrieved ${messages.length} messages (page ${safePage}/${totalPages})`);

      return {
        messages,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      };
    } catch (error) {
      logger.error('Failed to retrieve messages:', error);
      throw new Error(
        `Failed to retrieve messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves a single AI interaction by ID
   *
   * @param id - The UUID of the AI interaction
   * @returns Promise resolving to the AI interaction or null if not found
   * @throws Error if database query fails
   */
  static async getMessageById(id: string): Promise<AiInteraction | null> {
    try {
      const [message] = await db
        .select()
        .from(aiInteractions)
        .where(sql`${aiInteractions.id} = ${id}`)
        .limit(1);

      return message || null;
    } catch (error) {
      logger.error(`Failed to retrieve message ${id}:`, error);
      throw new Error(
        `Failed to retrieve message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets summary statistics for AI interactions
   *
   * @returns Promise resolving to summary statistics
   * @throws Error if database query fails
   */
  static async getMessageStats(): Promise<{
    total: number;
    totalTokens: number;
    avgResponseTime: number;
    errorRate: number;
  }> {
    try {
      const [stats] = await db
        .select({
          total: count(),
          totalTokens: sql<number>`COALESCE(SUM(${aiInteractions.totalTokens}), 0)`,
          avgResponseTime: sql<number>`COALESCE(AVG(${aiInteractions.responseTimeMs}), 0)`,
          errors: sql<number>`COUNT(CASE WHEN ${aiInteractions.error} IS NOT NULL THEN 1 END)`,
        })
        .from(aiInteractions);

      const errorRate = stats.total > 0 ? (stats.errors / stats.total) * 100 : 0;

      return {
        total: stats.total,
        totalTokens: stats.totalTokens,
        avgResponseTime: Math.round(stats.avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
      };
    } catch (error) {
      logger.error('Failed to retrieve message statistics:', error);
      throw new Error(
        `Failed to retrieve statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}