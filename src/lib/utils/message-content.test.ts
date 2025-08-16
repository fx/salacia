/**
 * @file Tests for message content extraction utilities
 */

import { describe, it, expect } from 'vitest';
import { extractTextContent } from './message-content.js';

describe('extractTextContent', () => {
  it('returns "No data" for null/undefined input', () => {
    expect(extractTextContent(null)).toBe('No data');
    expect(extractTextContent(undefined)).toBe('No data');
  });

  it('returns string input as-is if not JSON', () => {
    expect(extractTextContent('Hello world')).toBe('Hello world');
    expect(extractTextContent('Simple text')).toBe('Simple text');
  });

  it('extracts content from JSON string', () => {
    const jsonString = JSON.stringify({ content: 'Extracted text' });
    expect(extractTextContent(jsonString)).toBe('Extracted text');
  });

  it('extracts content from object with content field', () => {
    const data = { content: 'Test content' };
    expect(extractTextContent(data)).toBe('Test content');
  });

  it('extracts message content from object', () => {
    const data = { message: 'Test message' };
    expect(extractTextContent(data)).toBe('Test message');
  });

  it('extracts text field from object', () => {
    const data = { text: 'Test text' };
    expect(extractTextContent(data)).toBe('Test text');
  });

  it('extracts from OpenAI choices format', () => {
    const data = {
      choices: [
        {
          message: {
            content: 'AI response content',
          },
        },
      ],
    };
    expect(extractTextContent(data)).toBe('AI response content');
  });

  it('extracts from choices with text field', () => {
    const data = {
      choices: [
        {
          text: 'AI generated text',
        },
      ],
    };
    expect(extractTextContent(data)).toBe('AI generated text');
  });

  it('extracts from messages array', () => {
    const data = {
      messages: [{ content: 'First message' }, { content: 'Last message' }],
    };
    expect(extractTextContent(data)).toBe('Last message');
  });

  it('falls back to JSON string for unknown format', () => {
    const data = { unknown: 'field', value: 42 };
    const result = extractTextContent(data);
    expect(result).toContain('unknown');
    expect(result).toContain('field');
    expect(result).toContain('42');
  });

  it('truncates long JSON fallback', () => {
    const longData = {
      data: 'a'.repeat(200),
      more: 'data',
    };
    const result = extractTextContent(longData);
    expect(result.length).toBeLessThanOrEqual(103); // 100 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('handles invalid JSON gracefully', () => {
    expect(extractTextContent('invalid json {')).toBe('invalid json {');
  });

  it('falls back to JSON for complex nested structures', () => {
    const data = {
      response: {
        choices: [
          {
            message: {
              content: 'Nested content',
            },
          },
        ],
      },
    };
    const result = extractTextContent(data);
    expect(result).toContain('Nested content');
  });

  it('handles empty/whitespace content', () => {
    const data = { content: '   ' };
    const result = extractTextContent(data);
    expect(result).not.toBe('   ');
  });

  it('returns string representation for primitive types', () => {
    expect(extractTextContent(42)).toBe('42');
    expect(extractTextContent(true)).toBe('true');
  });
});
