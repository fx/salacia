import { describe, it, expect } from 'vitest';
import {
  generateRequestPreview,
  generateResponsePreview,
  generateContentPreviews,
} from './content-preview';

describe('Content Preview Utilities', () => {
  describe('generateRequestPreview', () => {
    it('handles null/undefined input', () => {
      expect(generateRequestPreview(null)).toBe('Empty request');
      expect(generateRequestPreview(undefined)).toBe('Empty request');
    });

    it('handles simple string input', () => {
      expect(generateRequestPreview('simple text')).toBe('simple text');

      const longText = 'a'.repeat(200);
      const result = generateRequestPreview(longText);
      expect(result).toHaveLength(153); // 150 chars + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('handles JSON string input', () => {
      const jsonString =
        '{"model": "claude-3", "messages": [{"role": "user", "content": "Hello"}]}';
      const result = generateRequestPreview(jsonString);
      expect(result).toContain('Model: claude-3');
      expect(result).toContain('User: "Hello"');
    });

    it('handles basic Anthropic request format', () => {
      const request = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        max_tokens: 100,
      };

      const result = generateRequestPreview(request);
      expect(result).toContain('Model: claude-3-sonnet-20240229');
      expect(result).toContain('User: "What is 2+2?"');
      expect(result).toContain('max: 100');
    });

    it('handles complex message content arrays', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image' },
              { type: 'image', source: { type: 'base64', data: 'base64data...' } },
            ],
          },
        ],
        max_tokens: 1000,
      };

      const result = generateRequestPreview(request);
      expect(result).toContain('Model: claude-3-haiku');
      expect(result).toContain('User: "Analyze this image"');
      expect(result).toContain('max: 1000');
    });

    it('handles requests with system prompts', () => {
      const request = {
        model: 'claude-3-opus',
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Help me with math' }],
        max_tokens: 500,
      };

      const result = generateRequestPreview(request);
      expect(result).toContain('Model: claude-3-opus');
      expect(result).toContain('User: "Help me with math"');
      expect(result).toContain('System: "You are a helpful assistant."');
    });

    it('handles requests with tools', () => {
      const request = {
        model: 'claude-3-sonnet',
        messages: [{ role: 'user', content: 'Read a file for me' }],
        tools: [
          { name: 'read_file', description: 'Read file contents' },
          { name: 'write_file', description: 'Write file contents' },
        ],
        max_tokens: 2000,
      };

      const result = generateRequestPreview(request);
      expect(result).toContain('Model: claude-3-sonnet');
      expect(result).toContain('User: "Read a file for me"');
      expect(result).toContain('2 tool(s)');
    });

    it('handles streaming requests', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Stream response' }],
        stream: true,
        temperature: 0.7,
      };

      const result = generateRequestPreview(request);
      expect(result).toContain('streaming');
      expect(result).toContain('temp: 0.7');
    });

    it('handles tool use messages', () => {
      const request = {
        model: 'claude-3-sonnet',
        messages: [
          { role: 'user', content: 'Use a tool' },
          {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'tool1', name: 'read_file', input: { path: '/test' } },
            ],
          },
          {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: 'tool1', content: 'File contents here' }],
          },
        ],
      };

      const result = generateRequestPreview(request);
      expect(result).toContain('User: "Use a tool"'); // Should get first user message, not tool result
    });

    it('handles Claude Code-style complex requests', () => {
      const complexRequest = {
        model: 'claude-sonnet-4-20250514',
        system: [
          {
            type: 'text',
            text: "You are Claude Code, Anthropic's official CLI for Claude. Very long system prompt...",
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: 'Create a new feature',
          },
        ],
        tools: [
          { name: 'Task', description: 'Launch agent' },
          { name: 'Read', description: 'Read file' },
          { name: 'Write', description: 'Write file' },
        ],
        max_tokens: 32000,
        temperature: 0,
      };

      const result = generateRequestPreview(complexRequest);
      expect(result).toContain('Model: claude-sonnet-4-20250514');
      expect(result).toContain('User: "Create a new feature"');
      expect(result).toContain('3 tool(s)');
      expect(result).toContain('max: 32000');
    });

    it('truncates very long previews', () => {
      const request = {
        model: 'claude-3-sonnet',
        messages: [
          {
            role: 'user',
            content: 'A'.repeat(200), // Very long message
          },
        ],
        system: 'B'.repeat(200), // Very long system prompt
        max_tokens: 1000,
      };

      const result = generateRequestPreview(request);
      expect(result.length).toBeLessThanOrEqual(153); // Max 150 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('handles invalid JSON gracefully', () => {
      const invalidJson = '{"invalid": json}';
      const result = generateRequestPreview(invalidJson);
      expect(result).toContain('{"invalid": json}');
    });
  });

  describe('generateResponsePreview', () => {
    it('handles null/undefined input', () => {
      expect(generateResponsePreview(null)).toBe('No response');
      expect(generateResponsePreview(undefined)).toBe('No response');
    });

    it('handles basic Anthropic response format', () => {
      const response = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'The answer is 4.' }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      };

      const result = generateResponsePreview(response);
      expect(result).toContain('"The answer is 4."');
      expect(result).toContain('model: claude-3-sonnet-20240229');
      expect(result).toContain('15 tokens');
      expect(result).toContain('stop: end_turn');
    });

    it('handles error responses', () => {
      const errorResponse = {
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: 'Missing required parameter: messages',
        },
      };

      const result = generateResponsePreview(errorResponse);
      expect(result).toBe('Error: Missing required parameter: messages');
    });

    it('handles responses with tool content', () => {
      const response = {
        id: 'msg_456',
        role: 'assistant',
        content: [
          { type: 'text', text: "I'll read the file for you." },
          {
            type: 'tool_use',
            id: 'tool_789',
            name: 'read_file',
            input: { path: '/workspace/file.txt' },
          },
        ],
        model: 'claude-3-opus',
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      const result = generateResponsePreview(response);
      expect(result).toContain('"I\'ll read the file for you. [Tool: read_file]"');
      expect(result).toContain('75 tokens');
    });

    it('handles streaming response chunks', () => {
      const streamChunk = {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'text_delta',
          text: 'Hello',
        },
      };

      const result = generateResponsePreview(streamChunk);
      expect(result).toContain('"Hello"');
    });

    it('handles empty content gracefully', () => {
      const response = {
        id: 'msg_empty',
        role: 'assistant',
        content: [],
        model: 'claude-3-haiku',
      };

      const result = generateResponsePreview(response);
      expect(result).toContain('model: claude-3-haiku');
      expect(result).toContain('Has content'); // Should indicate content exists even if empty
    });

    it('handles string responses', () => {
      const stringResponse = '{"role": "assistant", "content": "Simple response"}';
      const result = generateResponsePreview(stringResponse);
      expect(result).toContain('"Simple response"');
    });

    it('handles very long responses', () => {
      const response = {
        content: [{ type: 'text', text: 'A'.repeat(200) }],
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreview(response);
      expect(result.length).toBeLessThanOrEqual(153); // Max 150 + '...'
      // The result should be truncated but might not end with ... if metadata is added
      expect(result.length).toBeGreaterThan(60); // Should have content + metadata
    });

    it('handles malformed responses gracefully', () => {
      const malformed = { invalid: 'structure' };
      const result = generateResponsePreview(malformed);
      expect(result).toContain('Response received');
    });
  });

  describe('generateContentPreviews', () => {
    it('generates both request and response previews', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Test message' }],
      };

      const response = {
        content: [{ type: 'text', text: 'Test response' }],
        model: 'claude-3-haiku',
      };

      const result = generateContentPreviews(request, response);

      expect(result.requestPreview).toContain('Model: claude-3-haiku');
      expect(result.requestPreview).toContain('User: "Test message"');
      expect(result.responsePreview).toContain('"Test response"');
      expect(result.responsePreview).toContain('model: claude-3-haiku');
    });

    it('handles missing response', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = generateContentPreviews(request);

      expect(result.requestPreview).toContain('Model: claude-3-haiku');
      expect(result.responsePreview).toBeUndefined();
    });
  });

  describe('Real-world examples from test data', () => {
    it('handles MSW mock response format', () => {
      const mockResponse = {
        id: 'msg_01234567890abcdefghijk',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 18 },
      };

      const result = generateResponsePreview(mockResponse);
      expect(result).toContain('"Hello! How can I help you today?"');
      expect(result).toContain('model: claude-3-haiku-20240307');
      expect(result).toContain('30 tokens');
    });

    it('handles current database request format', () => {
      const dbRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        max_tokens: 100,
      };

      const result = generateRequestPreview(dbRequest);
      expect(result).toBe('Model: claude-3-sonnet-20240229 | User: "What is 2+2?" | [max: 100]');
    });

    it('handles complex Claude Code request from logs', () => {
      const claudeCodeRequest = {
        model: 'claude-sonnet-4-20250514',
        system: 'You are Claude Code',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Create a preview utility' }],
          },
        ],
        tools: [
          { name: 'Task' },
          { name: 'Bash' },
          { name: 'Read' },
          { name: 'Write' },
          { name: 'Edit' },
          { name: 'Glob' },
          { name: 'Grep' },
          { name: 'LS' },
        ],
        max_tokens: 32000,
        temperature: 0,
      };

      const result = generateRequestPreview(claudeCodeRequest);
      expect(result).toContain('Model: claude-sonnet-4-20250514');
      expect(result).toContain('Create a preview utility');
      expect(result).toContain('8 tool(s)');
      expect(result).toContain('max: 32000');
    });
  });
});
