import type { AiInteraction } from '../db/schema.js';

/**
 * Constants for pagination and display configuration.
 * These constants provide centralized configuration for UI behavior.
 */
export const MESSAGES_CONSTANTS = {
  /** Maximum number of pages to show in pagination UI */
  MAX_PAGINATION_PAGES: 10,
  /** Number of pages to show on each side when centering current page */
  PAGINATION_CENTER_OFFSET: 5,
  /** Maximum characters to show in message preview before truncation */
  MESSAGE_PREVIEW_MAX_LENGTH: 100,
} as const;

/**
 * Display-optimized representation of an AI interaction for web interfaces.
 * Transforms database records into a format suitable for frontend consumption
 * with computed fields and formatted data.
 */
export interface MessageDisplay {
  /** Unique identifier for the interaction */
  id: string;
  /** AI model used for the interaction */
  model: string;
  /** Provider name (if available) */
  provider?: string;
  /** Timestamp when the interaction was created */
  createdAt: Date;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Total tokens used in the interaction */
  totalTokens?: number;
  /** Prompt tokens used */
  promptTokens?: number;
  /** Completion tokens used */
  completionTokens?: number;
  /** HTTP status code of the response */
  statusCode?: number;
  /** Error message if the interaction failed */
  error?: string;
  /** Preview of the request content (truncated) */
  requestPreview: string;
  /** Preview of the response content (truncated) */
  responsePreview?: string;
  /** Whether the interaction was successful */
  isSuccess: boolean;
  /** Raw request data for detailed view */
  request: unknown;
  /** Raw response data for detailed view */
  response?: unknown;
}

/**
 * Statistics aggregated across multiple messages.
 * Provides summary metrics for displaying analytics and insights.
 */
export interface MessageStats {
  /** Total number of messages */
  totalMessages: number;
  /** Number of successful interactions */
  successfulMessages: number;
  /** Number of failed interactions */
  failedMessages: number;
  /** Success rate as a percentage (0-100) */
  successRate: number;
  /** Total tokens consumed across all messages */
  totalTokens: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Most frequently used model */
  mostUsedModel?: string;
  /** Total number of unique models used */
  uniqueModels: number;
}

/**
 * Supported sort fields for message queries.
 * Defines which fields can be used for ordering results.
 */
export type MessageSortField = 'createdAt' | 'model' | 'totalTokens' | 'responseTime';

/**
 * Sort direction for message queries.
 */
export type MessageSortDirection = 'asc' | 'desc';

/**
 * Sort configuration for message queries.
 */
export interface MessageSort {
  /** Field to sort by */
  field: MessageSortField;
  /** Sort direction */
  direction: MessageSortDirection;
}

/**
 * Parameters for filtering message queries.
 * Supports filtering by multiple criteria to narrow down results.
 */
export interface MessagesFilterParams {
  /** Filter by specific AI model */
  model?: string;
  /** Filter by provider name */
  provider?: string;
  /** Filter by date range - start date */
  startDate?: Date;
  /** Filter by date range - end date */
  endDate?: Date;
  /** Filter by success/failure status */
  hasError?: boolean;
  /** Filter by minimum token count */
  minTokens?: number;
  /** Filter by maximum token count */
  maxTokens?: number;
  /** Filter by minimum response time (ms) */
  minResponseTime?: number;
  /** Filter by maximum response time (ms) */
  maxResponseTime?: number;
  /** Search term for content matching */
  searchTerm?: string;
}

/**
 * Parameters for paginating message queries.
 * Handles page-based pagination with configurable page sizes.
 */
export interface MessagesPaginationParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page (1-100) */
  pageSize: number;
  /** Sort configuration */
  sort: MessageSort;
}

/**
 * Parameters for cursor-based pagination of message queries.
 * Provides efficient pagination for large datasets and real-time updates.
 */
export interface MessagesCursorPaginationParams {
  /** Number of items per page (1-100) */
  limit: number;
  /** Cursor for pagination (timestamp + id for uniqueness) */
  cursor?: string;
  /** Sort configuration - cursor pagination typically uses createdAt desc for newest first */
  sort: MessageSort;
}

/**
 * Result of a paginated message query.
 * Contains both the data and pagination metadata.
 */
export interface MessagesPaginatedResult {
  /** Array of message display objects */
  messages: MessageDisplay[];
  /** Current page number */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Applied sort configuration */
  sort: MessageSort;
  /** Applied filters */
  filters: MessagesFilterParams;
  /** Aggregated statistics for the filtered dataset */
  stats: MessageStats;
}

/**
 * Result of a cursor-based paginated message query.
 * Contains both the data and cursor metadata for efficient pagination.
 */
export interface MessagesCursorPaginatedResult {
  /** Array of message display objects */
  messages: MessageDisplay[];
  /** Number of items in this page */
  limit: number;
  /** Cursor for the next page (if available) */
  nextCursor?: string;
  /** Whether there are more items after this page */
  hasMore: boolean;
  /** Applied sort configuration */
  sort: MessageSort;
  /** Applied filters */
  filters: MessagesFilterParams;
  /** Aggregated statistics for the filtered dataset */
  stats: MessageStats;
}

/**
 * Utility functions for cursor-based pagination.
 */
export const CursorUtils = {
  /**
   * Creates a cursor from a message's timestamp and ID.
   * Combines createdAt timestamp and id for stable, unique pagination.
   *
   * @param createdAt - Timestamp of the message
   * @param id - Unique ID of the message
   * @returns Base64 encoded cursor string
   */
  encode(createdAt: Date, id: string): string {
    const cursorData = {
      timestamp: createdAt.getTime(),
      id,
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  },

  /**
   * Decodes a cursor string into timestamp and ID components.
   *
   * @param cursor - Base64 encoded cursor string
   * @returns Decoded cursor data or null if invalid
   */
  decode(cursor: string): { timestamp: number; id: string } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);

      if (typeof parsed.timestamp === 'number' && typeof parsed.id === 'string') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Creates a cursor from a message display object.
   *
   * @param message - Message display object
   * @returns Encoded cursor string
   */
  fromMessage(message: MessageDisplay): string {
    return this.encode(message.createdAt, message.id);
  },
};

/**
 * Transforms a database AI interaction record into a display-friendly format.
 * Computes derived fields and formats data for frontend consumption.
 *
 * Note: The provider field is set to undefined in this basic transformation.
 * When used through the service layer, provider names are populated by joining
 * with the aiProviders table using the providerId reference.
 *
 * @param interaction - Raw database record from aiInteractions table
 * @returns Formatted message display object with provider field undefined
 */
export function transformAiInteractionToDisplay(interaction: AiInteraction): MessageDisplay {
  // Extract request preview
  let requestPreview = 'No request data';
  if (interaction.request) {
    try {
      const requestStr =
        typeof interaction.request === 'string'
          ? interaction.request
          : JSON.stringify(interaction.request);
      requestPreview =
        requestStr.length > MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH
          ? `${requestStr.substring(0, MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH)}...`
          : requestStr;
    } catch {
      requestPreview = 'Invalid request data';
    }
  }

  // Extract response preview
  let responsePreview: string | undefined;
  if (interaction.response) {
    try {
      const responseStr =
        typeof interaction.response === 'string'
          ? interaction.response
          : JSON.stringify(interaction.response);
      responsePreview =
        responseStr.length > MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH
          ? `${responseStr.substring(0, MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH)}...`
          : responseStr;
    } catch {
      responsePreview = 'Invalid response data';
    }
  }

  return {
    id: interaction.id,
    model: interaction.model,
    provider: undefined, // Provider name will be populated by service layer when joining with aiProviders table
    createdAt: interaction.createdAt,
    responseTime: interaction.responseTimeMs ?? undefined,
    totalTokens: interaction.totalTokens ?? undefined,
    promptTokens: interaction.promptTokens ?? undefined,
    completionTokens: interaction.completionTokens ?? undefined,
    statusCode: interaction.statusCode ?? undefined,
    error: interaction.error || undefined,
    requestPreview,
    responsePreview,
    isSuccess: !interaction.error && interaction.statusCode === 200,
    request: interaction.request,
    response: interaction.response,
  };
}
