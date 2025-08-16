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
function extractFromParsedData(data: any): string {
  if (!data || typeof data !== 'object') {
    return String(data || 'No content');
  }

  // Common patterns for AI request/response content
  const textFields = ['content', 'message', 'text', 'prompt', 'response'];

  // Try to find text content in common fields
  for (const field of textFields) {
    const value = getNestedValue(data, field);
    if (value && typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  // Check for arrays of messages
  if (Array.isArray(data.messages)) {
    const lastMessage = data.messages[data.messages.length - 1];
    if (lastMessage && typeof lastMessage.content === 'string') {
      return lastMessage.content;
    }
  }

  // Check for choices array (OpenAI format)
  if (Array.isArray(data.choices) && data.choices[0]) {
    const choice = data.choices[0];
    if (choice.message && typeof choice.message.content === 'string') {
      return choice.message.content;
    }
    if (choice.text && typeof choice.text === 'string') {
      return choice.text;
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
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, obj);
}
