/**
 * Utilities for extracting meaningful text content from AI message data.
 *
 * @module MessageContentUtils
 */

/**
 * Extracts actual text content from JSON request/response data instead of showing raw JSON.
 *
 * @param data - Raw request or response data (can be string, object, or unknown)
 * @returns Extracted text content or fallback message
 */
export function extractTextContent(data: unknown): string {
  if (!data) return 'No data';

  try {
    // If it's already a string, check if it's JSON
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return extractFromParsedData(parsed);
      } catch {
        // Not JSON, return the string itself
        return data;
      }
    }

    // If it's an object, extract content
    return extractFromParsedData(data);
  } catch {
    return 'Invalid data';
  }
}

/**
 * Extracts text content from parsed JSON data by looking for common text fields.
 *
 * @param data - Parsed JSON object
 * @returns Extracted text content
 */
function extractFromParsedData(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return String(data || 'No content');
  }

  const dataObj = data as Record<string, unknown>;

  // Common patterns for AI request/response content
  const textFields = ['content', 'message', 'text', 'prompt', 'response'];

  // Try to find text content in common fields
  for (const field of textFields) {
    const value = getNestedValue(data, field);
    if (value && typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  // Check for Anthropic format: messages array with content
  if (Array.isArray(dataObj.messages) && dataObj.messages.length > 0) {
    const lastMessage = dataObj.messages[dataObj.messages.length - 1];
    if (lastMessage && typeof lastMessage === 'object' && lastMessage !== null) {
      const messageObj = lastMessage as Record<string, unknown>;
      if (typeof messageObj.content === 'string') {
        return messageObj.content;
      }
      // Handle content arrays (Anthropic format)
      if (Array.isArray(messageObj.content) && messageObj.content.length > 0) {
        const firstContent = messageObj.content[0];
        if (firstContent && typeof firstContent === 'object' && firstContent !== null) {
          const contentObj = firstContent as Record<string, unknown>;
          if (typeof contentObj.text === 'string') {
            return contentObj.text;
          }
        }
      }
    }
  }

  // Check for Claude Code specific response format: { "isNewTopic": boolean, "title": string, ... }
  if (
    'isNewTopic' in dataObj &&
    typeof dataObj.isNewTopic === 'boolean' &&
    'title' in dataObj &&
    typeof dataObj.title === 'string'
  ) {
    const icon = dataObj.isNewTopic ? '🆕' : '📄';
    return `${icon} ${dataObj.title}`;
  }

  // Check for Claude API response format: content array
  if (Array.isArray(dataObj.content) && dataObj.content.length > 0) {
    const firstContent = dataObj.content[0];
    if (firstContent && typeof firstContent === 'object' && firstContent !== null) {
      const contentObj = firstContent as Record<string, unknown>;
      if (typeof contentObj.text === 'string') {
        return contentObj.text;
      }
    }
  }

  // Check for choices array (OpenAI format)
  if (Array.isArray(dataObj.choices) && dataObj.choices[0]) {
    const choice = dataObj.choices[0];
    if (choice && typeof choice === 'object' && choice !== null) {
      const choiceObj = choice as Record<string, unknown>;
      if (
        choiceObj.message &&
        typeof choiceObj.message === 'object' &&
        choiceObj.message !== null
      ) {
        const messageObj = choiceObj.message as Record<string, unknown>;
        if (typeof messageObj.content === 'string') {
          return messageObj.content;
        }
      }
      if (typeof choiceObj.text === 'string') {
        return choiceObj.text;
      }
    }
  }

  // Fallback: stringify the object but truncate
  const jsonStr = JSON.stringify(data);
  return jsonStr.length > 100 ? `${jsonStr.substring(0, 100)}...` : jsonStr;
}

/**
 * Gets a nested value from an object using dot notation.
 *
 * @param obj - Object to search
 * @param path - Dot-notation path (e.g., 'choices.0.message.content')
 * @returns Found value or undefined
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string): unknown => {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, obj);
}
