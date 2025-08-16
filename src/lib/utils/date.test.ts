/**
 * @file Tests for date formatting utilities
 */

import { describe, it, expect } from 'vitest';
import { formatCompactDate } from './date.js';

describe('formatCompactDate', () => {
  it('formats date in M/D HH:mm:ss format', () => {
    const date = new Date('2024-03-15T14:30:45.123Z');
    const result = formatCompactDate(date);

    // Extract expected parts
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    const expected = `${month}/${day} ${hours}:${minutes}:${seconds}`;
    expect(result).toBe(expected);
  });

  it('handles single digit months and days', () => {
    const date = new Date('2024-01-05T09:05:03.000Z');
    const result = formatCompactDate(date);

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    const expected = `${month}/${day} ${hours}:${minutes}:${seconds}`;
    expect(result).toBe(expected);
  });

  it('zero-pads hours, minutes, and seconds', () => {
    const date = new Date('2024-12-25T01:02:03.000Z');
    const result = formatCompactDate(date);

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    const expected = `${month}/${day} ${hours}:${minutes}:${seconds}`;
    expect(result).toBe(expected);
  });
});
