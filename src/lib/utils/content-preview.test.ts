import { describe, it, expect } from 'vitest';
import {
  generateRequestPreview,
  generateResponsePreview,
  generateResponsePreviewEnhanced,
  generateContentPreviews,
  generateContentPreviewsEnhanced,
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
      expect(result).toBe('Hello');
    });

    it('handles basic Anthropic request format', () => {
      const request = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        max_tokens: 100,
      };

      const result = generateRequestPreview(request);
      expect(result).toBe('What is 2+2?');
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
      expect(result).toBe('Analyze this image');
    });

    it('handles requests with system prompts', () => {
      const request = {
        model: 'claude-3-opus',
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Help me with math' }],
        max_tokens: 500,
      };

      const result = generateRequestPreview(request);
      expect(result).toBe('Help me with math');
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
      expect(result).toBe('Read a file for me');
    });

    it('handles streaming requests', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Stream response' }],
        stream: true,
        temperature: 0.7,
      };

      const result = generateRequestPreview(request);
      expect(result).toBe('Stream response');
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
      expect(result).toBe('Use a tool'); // Should get first user message, not tool result
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
      expect(result).toBe('Create a new feature');
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
      expect(result).toBe('The answer is 4.');
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
      expect(result).toBe("I'll read the file for you. 🔧 read_file");
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
      expect(result).toBe('"Hello"');
    });

    it('handles empty content gracefully', () => {
      const response = {
        id: 'msg_empty',
        role: 'assistant',
        content: [],
        model: 'claude-3-haiku',
      };

      const result = generateResponsePreview(response);
      expect(result).toBe('∅ Empty response');
    });

    it('handles tool_use stop_reason with empty content', () => {
      const response = {
        id: 'msg_01YbvPJRLQCMzoaD21UCG9xc',
        role: 'assistant',
        type: 'message',
        model: 'claude-sonnet-4-20250514',
        usage: {
          input_tokens: 8894,
          output_tokens: 74,
        },
        content: [],
        stop_reason: 'tool_use',
        stop_sequence: null,
      };

      const result = generateResponsePreview(response);
      expect(result).toBe('🔧 Stop for tool use');
    });

    it('handles end_turn stop_reason with empty content', () => {
      const response = {
        id: 'msg_end_turn',
        role: 'assistant',
        type: 'message',
        model: 'claude-3-sonnet',
        content: [],
        stop_reason: 'end_turn',
        stop_sequence: null,
      };

      const result = generateResponsePreview(response);
      expect(result).toBe('✓ Response completed');
    });

    it('handles string responses', () => {
      const stringResponse = '{"role": "assistant", "content": "Simple response"}';
      const result = generateResponsePreview(stringResponse);
      expect(result).toBe('Simple response');
    });

    it('handles very long responses', () => {
      const response = {
        content: [{ type: 'text', text: 'A'.repeat(200) }],
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreview(response);
      expect(result.length).toBeLessThanOrEqual(153); // Max 150 + '...'
      expect(result.endsWith('...')).toBe(true);
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

      expect(result.requestPreview).toBe('Test message');
      expect(result.responsePreview).toBe('Test response');
    });

    it('handles missing response', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = generateContentPreviews(request);

      expect(result.requestPreview).toBe('Test');
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
      expect(result).toBe('Hello! How can I help you today?');
    });

    it('handles current database request format', () => {
      const dbRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        max_tokens: 100,
      };

      const result = generateRequestPreview(dbRequest);
      expect(result).toBe('What is 2+2?');
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
      expect(result).toBe('Create a preview utility');
    });
  });

  describe('generateResponsePreviewEnhanced', () => {
    it('includes stop_reason metadata when present with content', () => {
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

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('The answer is 4.');
      expect(result.stopReason).toEqual({
        icon: '✓',
        tooltip: 'Response completed naturally',
        value: 'end_turn',
      });
    });

    it('shows checkmark for end_turn responses with long content', () => {
      const longText =
        'This is a very long response that will be truncated because it exceeds the maximum length limit for previews in the message table display and continues for much longer than expected to test truncation behavior properly';
      const response = {
        content: [{ type: 'text', text: longText }],
        stop_reason: 'end_turn',
        model: 'claude-3-haiku',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text.length).toBeLessThanOrEqual(153); // Max 150 + '...'
      if (result.text.length > 150) {
        expect(result.text.endsWith('...')).toBe(true);
      }
      expect(result.stopReason).toEqual({
        icon: '✓',
        tooltip: 'Response completed naturally',
        value: 'end_turn',
      });
    });

    it('handles tool_use stop_reason', () => {
      const response = {
        id: 'msg_456',
        role: 'assistant',
        content: [],
        stop_reason: 'tool_use',
        model: 'claude-3-opus',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Stop for tool use');
      expect(result.stopReason).toEqual({
        icon: '🔧',
        tooltip: 'Stopped to use tools',
        value: 'tool_use',
      });
    });

    it('handles max_tokens stop_reason with content', () => {
      const response = {
        content: [{ type: 'text', text: 'Long response that got cut off' }],
        stop_reason: 'max_tokens',
        model: 'claude-3-haiku',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Long response that got cut off');
      expect(result.stopReason).toEqual({
        icon: '🚫',
        tooltip: 'Reached maximum token limit',
        value: 'max_tokens',
      });
    });

    it('handles stop_sequence stop_reason with content', () => {
      const response = {
        content: [{ type: 'text', text: 'Response that hit a stop word' }],
        stop_reason: 'stop_sequence',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Response that hit a stop word');
      expect(result.stopReason).toEqual({
        icon: '🛑',
        tooltip: 'Hit configured stop sequence',
        value: 'stop_sequence',
      });
    });

    it('handles unknown stop_reason with clear text in tooltip', () => {
      const response = {
        content: [{ type: 'text', text: 'Some response' }],
        stop_reason: 'custom_stop_sequence_xyz',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Some response');
      expect(result.stopReason).toEqual({
        icon: '⏹️',
        tooltip: 'Stopped: custom_stop_sequence_xyz',
        value: 'custom_stop_sequence_xyz',
      });
    });

    it('returns text only when no stop_reason present', () => {
      const response = {
        content: [{ type: 'text', text: 'Simple response' }],
        model: 'claude-3-haiku',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Simple response');
      expect(result.stopReason).toBeUndefined();
    });

    it('handles error responses with stop_reason', () => {
      const response = {
        error: {
          type: 'invalid_request_error',
          message: 'Missing required parameter',
        },
        stop_reason: 'error',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Error: Missing required parameter');
      expect(result.stopReason).toEqual({
        icon: '❌',
        tooltip: 'Error occurred during generation',
        value: 'error',
      });
    });
  });

  describe('generateContentPreviewsEnhanced', () => {
    it('generates enhanced previews with stop reason metadata', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Test message' }],
      };

      const response = {
        content: [{ type: 'text', text: 'Test response' }],
        stop_reason: 'end_turn',
        model: 'claude-3-haiku',
      };

      const result = generateContentPreviewsEnhanced(request, response);

      expect(result.requestPreview).toBe('Test message');
      expect(result.responsePreview?.text).toBe('Test response');
      expect(result.responsePreview?.stopReason).toEqual({
        icon: '✓',
        tooltip: 'Response completed naturally',
        value: 'end_turn',
      });
    });

    it('handles missing response in enhanced mode', () => {
      const request = {
        model: 'claude-3-haiku',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = generateContentPreviewsEnhanced(request);

      expect(result.requestPreview).toBe('Test');
      expect(result.responsePreview).toBeUndefined();
    });
  });

  describe('JSON metadata parsing', () => {
    it('parses isNewTopic and title from JSON at start of response', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '{"isNewTopic": true, "title": "Claude Identity"} I am Claude, an AI assistant created by Anthropic.',
          },
        ],
        stop_reason: 'end_turn',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Claude Identity');
      expect(result.topicInfo).toEqual({
        icon: '💡',
        title: 'Claude Identity',
        isNewTopic: true,
      });
      expect(result.stopReason).toEqual({
        icon: '✓',
        tooltip: 'Response completed naturally',
        value: 'end_turn',
      });
    });

    it('parses JSON with blank title and uses remaining text', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '{"isNewTopic": false, "title": ""} Let me help you with that coding problem.',
          },
        ],
        stop_reason: 'end_turn',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('Let me help you with that coding problem.');
      expect(result.topicInfo).toEqual({
        icon: '💬',
        title: 'Let me help you with that coding problem.',
        isNewTopic: false,
      });
    });

    it('handles JSON without topic metadata', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '{"model": "claude-3", "tokens": 100} This is a regular response.',
          },
        ],
        stop_reason: 'end_turn',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe('{"model": "claude-3", "tokens": 100} This is a regular response.');
      expect(result.topicInfo).toBeUndefined();
    });

    it('handles malformed JSON gracefully', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '{"isNewTopic": true, "title": "Broken JSON} This should work normally.',
          },
        ],
        stop_reason: 'end_turn',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe(
        '{"isNewTopic": true, "title": "Broken JSON} This should work normally.'
      );
      expect(result.topicInfo).toBeUndefined();
    });

    it('handles topic metadata with very long title', () => {
      const longTitle = 'A'.repeat(100);
      const response = {
        content: [
          {
            type: 'text',
            text: `{"isNewTopic": true, "title": "${longTitle}"} Additional content here.`,
          },
        ],
        stop_reason: 'end_turn',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toBe(longTitle);
      expect(result.topicInfo?.title).toBe(longTitle);
      expect(result.topicInfo?.isNewTopic).toBe(true);
    });

    it('fallback to remaining text when title is missing', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '{"isNewTopic": true} Here is the actual conversation content that should be used as title.',
          },
        ],
        stop_reason: 'end_turn',
        model: 'claude-3-sonnet',
      };

      const result = generateResponsePreviewEnhanced(response);

      expect(result.text).toContain('Here is the actual conversation content that shoul');
      expect(result.text.endsWith('...')).toBe(true);
      expect(result.topicInfo?.icon).toBe('💡');
      expect(result.topicInfo?.isNewTopic).toBe(true);
      expect(result.topicInfo?.title).toContain('Here is the actual conversation content');
    });
  });
});
