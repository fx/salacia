import type { AiInteraction } from '../db/schema.js';
import type { MessageSort } from './cursor.js';

/**
 * Display-optimized message representation.
 */
export interface MessageDisplay {
  id: string;
  model: string;
  provider?: string;
  createdAt: Date;
  responseTime?: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  statusCode?: number;
  error?: string;
  requestPreview: string;
  responsePreview?: string;
  isSuccess: boolean;
  request: unknown;
  response?: unknown;
}

/**
 * Cursor paginated result.
 */
export interface MessagesCursorPaginatedResult {
  messages: MessageDisplay[];
  limit: number;
  nextCursor?: string;
  hasMore: boolean;
  sort: MessageSort;
}

/**
 * Transform AI interaction to display format.
 */
export function transformAiInteractionToDisplay(interaction: AiInteraction): MessageDisplay {
  const requestPreview = typeof interaction.request === 'string' 
    ? interaction.request.substring(0, 100) 
    : JSON.stringify(interaction.request).substring(0, 100);

  const responsePreview = interaction.response 
    ? (typeof interaction.response === 'string' 
        ? interaction.response.substring(0, 100) 
        : JSON.stringify(interaction.response).substring(0, 100))
    : undefined;

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