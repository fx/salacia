import type { AiInteraction } from '../db/schema';

/**
 * Processed message data optimized for display in the web interface
 */
export interface MessageDisplay {
  /** Unique identifier */
  id: string;
  /** AI model used */
  model: string;
  /** Provider name (if available) */
  provider?: string;
  /** Request timestamp */
  createdAt: Date;
  /** Token usage summary */
  tokens: {
    prompt: number | null;
    completion: number | null;
    total: number | null;
  };
  /** Response time in milliseconds */
  responseTime: number | null;
  /** HTTP status code */
  statusCode: number | null;
  /** Error message if request failed */
  error: string | null;
  /** Has successful response */
  isSuccess: boolean;
  /** Simplified request content for display */
  requestSummary: {
    /** Number of messages in the request */
    messageCount: number;
    /** First user message preview (truncated) */
    preview: string;
    /** Whether request included system message */
    hasSystem: boolean;
  };
  /** Response content summary */
  responseSummary: {
    /** Response text preview (truncated) */
    preview: string;
    /** Response length in characters */
    length: number;
  } | null;
}

/**
 * Transform raw AI interaction data into display-optimized format
 *
 * @param interaction - Raw AI interaction from database
 * @returns Processed message display data
 */
export function transformToMessageDisplay(interaction: AiInteraction): MessageDisplay {
  // Extract request summary
  const request = interaction.request as any;
  const messages = request?.messages || [];
  const userMessages = messages.filter((m: any) => m.role === 'user');
  const firstUserMessage = userMessages[0]?.content || '';
  const preview = typeof firstUserMessage === 'string' 
    ? firstUserMessage.slice(0, 100) + (firstUserMessage.length > 100 ? '...' : '')
    : '[Complex content]';

  // Extract response summary
  let responseSummary: MessageDisplay['responseSummary'] = null;
  if (interaction.response) {
    const response = interaction.response as any;
    const content = response?.content?.[0]?.text || response?.text || '';
    if (content) {
      responseSummary = {
        preview: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
        length: content.length,
      };
    }
  }

  return {
    id: interaction.id,
    model: interaction.model,
    createdAt: interaction.createdAt,
    tokens: {
      prompt: interaction.promptTokens,
      completion: interaction.completionTokens,
      total: interaction.totalTokens,
    },
    responseTime: interaction.responseTimeMs,
    statusCode: interaction.statusCode,
    error: interaction.error,
    isSuccess: !interaction.error && (interaction.statusCode === 200 || interaction.statusCode === null),
    requestSummary: {
      messageCount: messages.length,
      preview,
      hasSystem: request?.system ? true : false,
    },
    responseSummary,
  };
}

/**
 * Available filter options for the messages interface
 */
export interface MessageFilterOptions {
  /** Available models */
  models: string[];
  /** Available providers */
  providers: Array<{ id: string; name: string }>;
  /** Date range bounds */
  dateRange: {
    earliest: Date;
    latest: Date;
  };
}

/**
 * Real-time statistics for the messages dashboard
 */
export interface MessageStats {
  /** Total number of interactions */
  total: number;
  /** Total tokens consumed */
  totalTokens: number;
  /** Average response time in milliseconds */
  avgResponseTime: number;
  /** Error rate as percentage */
  errorRate: number;
  /** Recent activity (last 24h) */
  recent: {
    /** Interactions in last 24h */
    count: number;
    /** Success rate in last 24h */
    successRate: number;
  };
}