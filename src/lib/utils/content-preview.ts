/**
 * Content preview utilities for generating human-readable summaries
 * of various API request and response formats.
 *
 * This module provides intelligent content analysis that can extract
 * meaningful previews from different data structures without being
 * tied to specific API providers.
 */

/**
 * Preview generation configuration
 */
const PREVIEW_CONFIG = {
  /** Maximum length for generated previews */
  MAX_LENGTH: 150,
  /** Maximum number of array items to include in preview */
  MAX_ARRAY_ITEMS: 3,
  /** Maximum depth for nested object traversal */
  MAX_DEPTH: 3,
} as const;

/**
 * Maps stop_reason values to appropriate icons with hover text
 */
const STOP_REASON_ICONS = {
  end_turn: { icon: '✓', tooltip: 'Response completed naturally' },
  max_tokens: { icon: '🚫', tooltip: 'Reached maximum token limit' },
  stop_sequence: { icon: '🛑', tooltip: 'Hit configured stop sequence' },
  tool_use: { icon: '🔧', tooltip: 'Stopped to use tools' },
  timeout: { icon: '⏱️', tooltip: 'Request timed out' },
  error: { icon: '❌', tooltip: 'Error occurred during generation' },
} as const;

/**
 * Gets the appropriate icon and tooltip for a stop reason
 */
function getStopReasonIcon(stopReason: string): { icon: string; tooltip: string } {
  if (!stopReason || typeof stopReason !== 'string') {
    return { icon: '⏹️', tooltip: 'Response stopped' };
  }

  const known = STOP_REASON_ICONS[stopReason as keyof typeof STOP_REASON_ICONS];
  if (known) {
    return known;
  }

  // Default for unknown stop reasons - show the stop reason clearly
  return { icon: '⏹️', tooltip: `Stopped: ${stopReason}` };
}

/**
 * Interface for structured content that might contain messages
 */
interface MessageLike {
  role?: string;
  content?: unknown;
  text?: string;
  type?: string;
}

/**
 * Interface for API request-like objects
 */
interface RequestLike {
  model?: string;
  messages?: MessageLike[];
  system?: unknown;
  tools?: unknown[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Interface for API response-like objects
 */
interface ResponseLike {
  id?: string;
  type?: string;
  role?: string;
  content?: unknown;
  model?: string;
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    type?: string;
    message?: string;
  };
}

/**
 * Enhanced preview result with optional metadata for stop reasons
 */
export interface PreviewResult {
  /** The main preview text */
  text: string;
  /** Optional stop reason icon and tooltip */
  stopReason?: {
    icon: string;
    tooltip: string;
    value: string;
  };
}

/**
 * Extracts text content from various content formats
 * Handles string, array of content blocks, and nested structures
 */
function extractTextContent(
  content: unknown,
  maxLength: number = PREVIEW_CONFIG.MAX_LENGTH
): string {
  if (!content) return '';

  // Handle string content directly
  if (typeof content === 'string') {
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  }

  // Handle array of content blocks
  if (Array.isArray(content)) {
    const texts: string[] = [];
    let totalLength = 0;

    for (const item of content.slice(0, PREVIEW_CONFIG.MAX_ARRAY_ITEMS)) {
      let itemText = '';

      if (typeof item === 'string') {
        itemText = item;
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        // Try common text fields
        itemText = (obj.text || obj.content || obj.message || '') as string;

        // Handle tool use/result content
        if (obj.type === 'tool_use' && obj.name) {
          itemText = `🔧 ${obj.name}`;
        } else if (obj.type === 'tool_result') {
          itemText = '🔧 Tool Result';
        }
      }

      if (itemText && typeof itemText === 'string') {
        if (totalLength + itemText.length > maxLength) {
          itemText = itemText.substring(0, maxLength - totalLength);
          texts.push(itemText);
          break;
        }
        texts.push(itemText);
        totalLength += itemText.length;
      }
    }

    const result = texts.join(' ');
    return result.length > maxLength ? `${result.substring(0, maxLength)}...` : result;
  }

  // Handle object with text properties
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    const textField = obj.text || obj.content || obj.message || obj.data;
    if (textField) {
      return extractTextContent(textField, maxLength);
    }
  }

  return '';
}

/**
 * Extracts the last user message from a messages array
 * Prioritizes the most recent user input for context
 */
function extractUserMessage(messages: MessageLike[]): string {
  // Find the last user message that contains actual text (not just tool results or system reminders)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const content = extractTextContent(msg.content, PREVIEW_CONFIG.MAX_LENGTH);
      // Skip messages that only contain tool results, system reminders, or are too long (likely system prompts)
      if (
        content &&
        !content.startsWith('🔧 Tool Result') &&
        !content.startsWith('[Tool Result]') &&
        !content.includes('<system-reminder>') &&
        !content.includes('claudeMd') &&
        !content.includes('Codebase and user instructions') &&
        content.length < 500
      ) {
        // Reasonable length for actual user questions
        return content;
      }
    }
  }

  // Look for any user message that contains tool use (instead of just tool results)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const content = extractTextContent(msg.content, PREVIEW_CONFIG.MAX_LENGTH);
      if (content && (content.includes('🔧') || content.includes('[Tool:'))) {
        return content; // Show tool use messages
      }
    }
  }

  // Fallback: look for any short user message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const content = extractTextContent(msg.content, 50); // Shorter fallback
      if (content && content.length < 100 && !content.includes('<system-reminder>')) {
        return content;
      }
    }
  }

  // Final fallback to message count
  const userMessageCount = messages.filter(msg => msg.role === 'user').length;
  if (userMessageCount > 0) {
    return `${userMessageCount} user message(s)`;
  }

  return '';
}

/**
 * Generates a human-readable preview for API request data
 * Intelligently handles different request formats and extracts key information
 */
export function generateRequestPreview(data: unknown): string {
  if (!data) return 'Empty request';

  try {
    // Handle string data (raw JSON)
    if (typeof data === 'string') {
      // Try to parse as JSON for better preview
      try {
        const parsed = JSON.parse(data);
        return generateRequestPreview(parsed);
      } catch {
        // Return truncated string if JSON parsing fails
        if (data.length <= PREVIEW_CONFIG.MAX_LENGTH) {
          return data;
        }
        return `${data.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`;
      }
    }

    // Handle object data
    if (data && typeof data === 'object') {
      const req = data as RequestLike;

      // Just show the user message - model is already in the table
      if (req.messages && Array.isArray(req.messages) && req.messages.length > 0) {
        const userMsg = extractUserMessage(req.messages);
        if (userMsg) {
          return userMsg.length > PREVIEW_CONFIG.MAX_LENGTH
            ? `${userMsg.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
            : userMsg;
        }
      }

      // Fallback if no user message found
      return 'Request data';
    }

    // Fallback for other types
    const stringified = String(data);
    return stringified.length > PREVIEW_CONFIG.MAX_LENGTH
      ? `${stringified.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
      : stringified;
  } catch {
    return 'Unable to parse request';
  }
}

/**
 * Generates an enhanced preview for API response data with stop reason metadata
 * Handles different response formats and extracts meaningful content
 */
export function generateResponsePreviewEnhanced(data: unknown): PreviewResult {
  if (!data) return { text: 'No response' };

  try {
    // Handle string data (raw JSON)
    if (typeof data === 'string') {
      // Try to parse as JSON for better preview
      try {
        const parsed = JSON.parse(data);
        return generateResponsePreviewEnhanced(parsed);
      } catch {
        // Return truncated string if JSON parsing fails
        const text =
          data.length <= PREVIEW_CONFIG.MAX_LENGTH
            ? data
            : `${data.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`;
        return { text };
      }
    }

    // Handle object data
    if (data && typeof data === 'object') {
      const resp = data as ResponseLike & { delta?: { text?: string; type?: string } };
      const result: PreviewResult = { text: '' };

      // Add stop reason metadata if present
      if (resp.stop_reason) {
        const stopReasonData = getStopReasonIcon(resp.stop_reason);
        result.stopReason = {
          icon: stopReasonData.icon,
          tooltip: stopReasonData.tooltip,
          value: resp.stop_reason,
        };
      }

      // Handle error responses
      if (resp.error) {
        const errorMsg = resp.error.message || resp.error.type || 'Unknown error';
        result.text = `Error: ${errorMsg}`;
        return result;
      }

      // Handle streaming chunks
      if (resp.delta && resp.delta.text) {
        result.text = `"${resp.delta.text}"`;
        return result;
      }

      // Handle content
      if (resp.content) {
        // Get full content first to check if truncation is needed
        const fullContentText = extractTextContent(resp.content, 99999);
        if (fullContentText) {
          // Handle special tool-related content
          if (
            fullContentText.includes('<is_displaying_contents>') ||
            fullContentText.includes('<filepaths>') ||
            fullContentText.includes('tool_use') ||
            fullContentText.includes('tool_result')
          ) {
            result.text = '🔧 Tool response';
          } else {
            result.text =
              fullContentText.length > PREVIEW_CONFIG.MAX_LENGTH
                ? `${fullContentText.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
                : fullContentText;
          }
        } else if (Array.isArray(resp.content) && resp.content.length === 0) {
          // Handle empty content arrays - check stop_reason for context
          if (resp.stop_reason === 'tool_use') {
            result.text = 'Stop for tool use';
          } else if (resp.stop_reason === 'end_turn') {
            result.text = 'Response completed';
          } else {
            result.text = '∅ Empty response';
          }
        } else {
          result.text = 'Has content';
        }
      } else {
        result.text = 'Response received';
      }

      return result;
    }

    // Fallback for other types
    const stringified = String(data);
    const text =
      stringified.length > PREVIEW_CONFIG.MAX_LENGTH
        ? `${stringified.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
        : stringified;
    return { text };
  } catch {
    return { text: 'Unable to parse response' };
  }
}

/**
 * Generates a human-readable preview for API response data
 * Handles different response formats and extracts meaningful content
 * @deprecated Use generateResponsePreviewEnhanced for stop reason metadata
 */
export function generateResponsePreview(data: unknown): string {
  if (!data) return 'No response';

  try {
    // Handle string data (raw JSON)
    if (typeof data === 'string') {
      // Try to parse as JSON for better preview
      try {
        const parsed = JSON.parse(data);
        return generateResponsePreview(parsed);
      } catch {
        // Return truncated string if JSON parsing fails
        if (data.length <= PREVIEW_CONFIG.MAX_LENGTH) {
          return data;
        }
        return `${data.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`;
      }
    }

    // Handle object data
    if (data && typeof data === 'object') {
      const resp = data as ResponseLike & { delta?: { text?: string; type?: string } };

      // Handle error responses
      if (resp.error) {
        const errorMsg = resp.error.message || resp.error.type || 'Unknown error';
        return `Error: ${errorMsg}`;
      }

      // Handle streaming chunks
      if (resp.delta && resp.delta.text) {
        return `"${resp.delta.text}"`;
      }

      // Just show the content - model is already in the table
      if (resp.content) {
        // Get full content first to check if truncation is needed
        const fullContentText = extractTextContent(resp.content, 99999);
        if (fullContentText) {
          // Handle special tool-related content
          if (
            fullContentText.includes('<is_displaying_contents>') ||
            fullContentText.includes('<filepaths>') ||
            fullContentText.includes('tool_use') ||
            fullContentText.includes('tool_result')
          ) {
            return '🔧 Tool response';
          } else {
            return fullContentText.length > PREVIEW_CONFIG.MAX_LENGTH
              ? `${fullContentText.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
              : fullContentText;
          }
        } else if (Array.isArray(resp.content) && resp.content.length === 0) {
          // Handle empty content arrays - check stop_reason for context
          if (resp.stop_reason === 'tool_use') {
            return '🔧 Stop for tool use';
          } else if (resp.stop_reason === 'end_turn') {
            return '✓ Response completed';
          } else {
            return '∅ Empty response';
          }
        } else {
          return 'Has content';
        }
      }

      return 'Response received';
    }

    // Fallback for other types
    const stringified = String(data);
    return stringified.length > PREVIEW_CONFIG.MAX_LENGTH
      ? `${stringified.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
      : stringified;
  } catch {
    return 'Unable to parse response';
  }
}

/**
 * Enhanced content previews with stop reason metadata
 */
export interface ContentPreviewsEnhanced {
  requestPreview: string;
  responsePreview?: PreviewResult;
}

/**
 * Generates enhanced previews for both request and response data
 * Includes stop reason metadata for responses
 */
export function generateContentPreviewsEnhanced(
  request: unknown,
  response?: unknown
): ContentPreviewsEnhanced {
  return {
    requestPreview: generateRequestPreview(request),
    responsePreview: response ? generateResponsePreviewEnhanced(response) : undefined,
  };
}

/**
 * Generates previews for both request and response data
 * Convenience function that returns both previews in a consistent format
 * @deprecated Use generateContentPreviewsEnhanced for stop reason metadata
 */
export function generateContentPreviews(request: unknown, response?: unknown) {
  return {
    requestPreview: generateRequestPreview(request),
    responsePreview: response ? generateResponsePreview(response) : undefined,
  };
}
