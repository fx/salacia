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
          itemText = `[Tool: ${obj.name}]`;
        } else if (obj.type === 'tool_result') {
          itemText = '[Tool Result]';
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
  // Find the last user message that contains actual text (not just tool results)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const content = extractTextContent(msg.content, PREVIEW_CONFIG.MAX_LENGTH);
      // Skip messages that only contain tool results
      if (content && !content.startsWith('[Tool Result]')) {
        return content;
      }
    }
  }

  // Fallback to any user message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      return extractTextContent(msg.content, PREVIEW_CONFIG.MAX_LENGTH);
    }
  }

  // Fallback to any message
  if (messages.length > 0) {
    return extractTextContent(messages[messages.length - 1].content, PREVIEW_CONFIG.MAX_LENGTH);
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

      // Build preview components
      const parts: string[] = [];

      // Add model info
      if (req.model) {
        parts.push(`Model: ${req.model}`);
      }

      // Extract and add user message
      if (req.messages && Array.isArray(req.messages) && req.messages.length > 0) {
        const userMsg = extractUserMessage(req.messages);
        if (userMsg) {
          parts.push(`User: "${userMsg}"`);
        } else {
          parts.push(`${req.messages.length} message(s)`);
        }
      }

      // Add system prompt info if present
      if (req.system) {
        const systemText = extractTextContent(req.system, 30);
        if (systemText) {
          parts.push(`System: "${systemText}"`);
        } else {
          parts.push('Has system prompt');
        }
      }

      // Add tools info
      if (req.tools && Array.isArray(req.tools) && req.tools.length > 0) {
        parts.push(`${req.tools.length} tool(s)`);
      }

      // Add configuration details
      const configs: string[] = [];
      if (req.max_tokens) configs.push(`max: ${req.max_tokens}`);
      if (req.temperature !== undefined) configs.push(`temp: ${req.temperature}`);
      if (req.stream) configs.push('streaming');

      if (configs.length > 0) {
        parts.push(`[${configs.join(', ')}]`);
      }

      // Join and truncate if necessary
      const preview = parts.join(' | ');
      return preview.length > PREVIEW_CONFIG.MAX_LENGTH
        ? `${preview.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
        : preview;
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
 * Generates a human-readable preview for API response data
 * Handles different response formats and extracts meaningful content
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

      // Build preview components
      const parts: string[] = [];

      // Add content preview
      if (resp.content) {
        const contentText = extractTextContent(resp.content, 60);
        if (contentText) {
          parts.push(`"${contentText}"`);
        } else {
          parts.push('Has content');
        }
      }

      // Add metadata
      const metadata: string[] = [];
      if (resp.model) metadata.push(`model: ${resp.model}`);
      if (resp.stop_reason) metadata.push(`stop: ${resp.stop_reason}`);

      // Add usage info
      if (resp.usage) {
        const usage = resp.usage;
        if (usage.total_tokens || (usage.input_tokens && usage.output_tokens)) {
          const total =
            usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0);
          metadata.push(`${total} tokens`);
        }
      }

      if (metadata.length > 0) {
        parts.push(`[${metadata.join(', ')}]`);
      }

      // Join and truncate if necessary
      const preview = parts.join(' ');
      if (preview) {
        return preview.length > PREVIEW_CONFIG.MAX_LENGTH
          ? `${preview.substring(0, PREVIEW_CONFIG.MAX_LENGTH)}...`
          : preview;
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
 * Generates previews for both request and response data
 * Convenience function that returns both previews in a consistent format
 */
export function generateContentPreviews(request: unknown, response?: unknown) {
  return {
    requestPreview: generateRequestPreview(request),
    responsePreview: response ? generateResponsePreview(response) : undefined,
  };
}
