import { createLogger } from '../../../utils/logger';
import type { AnthropicRequest, AnthropicResponse } from '../../types';

const logger = createLogger('AnthropicClient');

/**
 * Claude Code tool definitions that match the actual tools available
 * These enable tool execution mode when included in requests
 */
const CLAUDE_CODE_TOOLS = [
  {
    name: 'Task',
    description: 'Launch a new agent to handle complex, multi-step tasks autonomously',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string', description: 'A short (3-5 word) description of the task' },
        prompt: { type: 'string', description: 'The task for the agent to perform' },
        subagent_type: {
          type: 'string',
          description: 'The type of specialized agent to use for this task',
        },
      },
      required: ['description', 'prompt', 'subagent_type'],
    },
  },
  {
    name: 'Bash',
    description: 'Executes a given bash command in a persistent shell session',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: 'The command to execute' },
        description: {
          type: 'string',
          description: 'Clear, concise description of what this command does',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'Read',
    description: 'Reads a file from the local filesystem',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_path: { type: 'string', description: 'The absolute path to the file to read' },
        limit: { type: 'number', description: 'The number of lines to read' },
        offset: { type: 'number', description: 'The line number to start reading from' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Write',
    description: 'Writes a file to the local filesystem',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_path: { type: 'string', description: 'The absolute path to the file to write' },
        content: { type: 'string', description: 'The content to write to the file' },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'Edit',
    description: 'Performs exact string replacements in files',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_path: { type: 'string', description: 'The absolute path to the file to modify' },
        old_string: { type: 'string', description: 'The text to replace' },
        new_string: { type: 'string', description: 'The text to replace it with' },
        replace_all: { type: 'boolean', description: 'Replace all occurrences of old_string' },
      },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'Glob',
    description: 'Fast file pattern matching tool that works with any codebase size',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'The glob pattern to match files against' },
        path: { type: 'string', description: 'The directory to search in' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Grep',
    description: 'A powerful search tool built on ripgrep',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'The regular expression pattern to search for' },
        path: { type: 'string', description: 'File or directory to search in' },
        output_mode: { type: 'string', enum: ['content', 'files_with_matches', 'count'] },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'LS',
    description: 'Lists files and directories in a given path',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'The absolute path to the directory to list' },
      },
      required: ['path'],
    },
  },
];

/**
 * Anthropic API client that bypasses the Vercel AI SDK
 * This is needed for OAuth token spoofing to work properly
 */
export class AnthropicClient {
  private baseURL: string;
  private token: string;

  constructor(token: string, baseURL: string = 'https://api.anthropic.com/v1') {
    this.token = token;
    this.baseURL = baseURL;
  }

  async createMessage(request: AnthropicRequest): Promise<AnthropicResponse> {
    const url = `${this.baseURL}/messages`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'user-agent': 'claude-cli/1.0.81',
      'anthropic-beta':
        'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
    };

    const modifiedRequest = { ...request };
    const claudeCodePrompt = "You are Claude Code, Anthropic's official CLI for Claude.";

    // Always add Claude Code tools to enable tool execution mode
    modifiedRequest.tools = CLAUDE_CODE_TOOLS;
    logger.debug('Adding Claude Code tools to request', {
      toolCount: CLAUDE_CODE_TOOLS.length,
      tools: CLAUDE_CODE_TOOLS.map(t => t.name),
    });

    if (modifiedRequest.system) {
      if (typeof modifiedRequest.system === 'string') {
        if (!modifiedRequest.system.includes('You are Claude Code')) {
          modifiedRequest.system = `${claudeCodePrompt}\n${modifiedRequest.system}`;
        }
      } else if (Array.isArray(modifiedRequest.system)) {
        const firstTextBlock = modifiedRequest.system.find(
          block => block.type === 'text' && block.text
        );
        if (firstTextBlock && !firstTextBlock.text.includes('You are Claude Code')) {
          firstTextBlock.text = `${claudeCodePrompt}\n${firstTextBlock.text}`;
        }
      }
    } else {
      modifiedRequest.system = claudeCodePrompt;
    }

    logger.debug('Making Anthropic API call', {
      url,
      model: request.model,
      hasToken: !!this.token,
      headers: { ...headers, Authorization: 'Bearer [REDACTED]' },
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(modifiedRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Anthropic API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        throw new Error(
          errorData.error?.message ||
            `Anthropic API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as AnthropicResponse;
    } catch (error) {
      logger.error('Failed to call Anthropic API', error);
      throw error;
    }
  }

  async createStreamingMessage(request: AnthropicRequest): Promise<ReadableStream> {
    const url = `${this.baseURL}/messages`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'user-agent': 'claude-cli/1.0.81',
      'anthropic-beta':
        'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
    };

    const modifiedRequest = { ...request, stream: true };
    const claudeCodePrompt = "You are Claude Code, Anthropic's official CLI for Claude.";

    // Always add Claude Code tools to enable tool execution mode
    modifiedRequest.tools = CLAUDE_CODE_TOOLS;
    logger.debug('Adding Claude Code tools to streaming request', {
      toolCount: CLAUDE_CODE_TOOLS.length,
      tools: CLAUDE_CODE_TOOLS.map(t => t.name),
    });

    if (modifiedRequest.system) {
      if (typeof modifiedRequest.system === 'string') {
        if (!modifiedRequest.system.includes('You are Claude Code')) {
          modifiedRequest.system = `${claudeCodePrompt}\n${modifiedRequest.system}`;
        }
      } else if (Array.isArray(modifiedRequest.system)) {
        const firstTextBlock = modifiedRequest.system.find(
          block => block.type === 'text' && block.text
        );
        if (firstTextBlock && !firstTextBlock.text.includes('You are Claude Code')) {
          firstTextBlock.text = `${claudeCodePrompt}\n${firstTextBlock.text}`;
        }
      }
    } else {
      modifiedRequest.system = claudeCodePrompt;
    }

    logger.debug('Making streaming Anthropic API call', {
      url,
      model: request.model,
      hasToken: !!this.token,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(modifiedRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Anthropic API streaming error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        throw new Error(
          errorData.error?.message ||
            `Anthropic API error: ${response.status} ${response.statusText}`
        );
      }

      // Ensure we're returning the raw stream from Anthropic without any processing
      if (!response.body) {
        throw new Error('No response body received from Anthropic API');
      }

      return response.body;
    } catch (error) {
      logger.error('Failed to create streaming response', error);
      throw error;
    }
  }
}
