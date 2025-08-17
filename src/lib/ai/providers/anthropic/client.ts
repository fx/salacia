import { createLogger } from '../../../utils/logger';
import type { AnthropicRequest, AnthropicResponse } from '../../types';

const logger = createLogger('AnthropicClient');

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
