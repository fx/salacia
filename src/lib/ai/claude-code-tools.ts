/**
 * Claude Code tools support
 *
 * This module provides automatic injection of essential Claude Code tools
 * for Claude Code CLI requests, ensuring proper tool calling support.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('ClaudeCodeTools');

/**
 * Essential Claude Code tools that should be auto-injected
 * These tools are commonly used by Claude Code and should be available by default
 */
export const CLAUDE_CODE_TOOLS: Array<{
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}> = [
  {
    name: 'Read',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The path to the file to read',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Write',
    description: 'Write content to a file',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The path to the file to write',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'LS',
    description: 'List files in a directory',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'Bash',
    description: 'Execute a bash command',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute',
        },
      },
      required: ['command'],
    },
  },
];

/**
 * Check if a request is from Claude Code CLI
 * @param headers Request headers
 * @returns True if the request is from Claude Code
 */
export function isClaudeCodeRequest(headers: Record<string, string>): boolean {
  // Check for Claude Code specific headers
  const userAgent = headers['user-agent'] || '';
  const xClientName = headers['x-client-name'] || '';

  // Claude Code typically sends specific user-agent or client identification
  const isClaudeCode =
    userAgent.toLowerCase().includes('claude') ||
    xClientName.toLowerCase().includes('claude') ||
    // Check for CLI-specific patterns
    userAgent.includes('CLI') ||
    // Check for terminal-based patterns
    headers['x-terminal'] === 'true';

  if (isClaudeCode) {
    logger.debug('Detected Claude Code request', { userAgent, xClientName });
  }

  return isClaudeCode;
}
