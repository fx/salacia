import type { AiInteraction } from '../db/schema.js';
import type { MessageSort } from './cursor.js';

/**
 * Constants for pagination and display configuration.
 * These constants provide centralized configuration for UI behavior.
 */
export const MESSAGES_CONSTANTS = {
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
}

/**
 * Transforms a database AI interaction record into a display-friendly format.
 * Computes derived fields and formats data for frontend consumption.
 *
 * @param interaction - Raw database record from aiInteractions table
 * @returns Formatted message display object
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
    provider: interaction.provider || undefined,
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