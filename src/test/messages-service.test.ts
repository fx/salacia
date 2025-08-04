import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MessagesService } from '../lib/services/messages';
import { db } from '../lib/db/connection';
import { aiInteractions, aiProviders } from '../lib/db/schema';
import { sql } from 'drizzle-orm';

describe('MessagesService', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(aiInteractions);
    await db.delete(aiProviders);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(aiInteractions);
    await db.delete(aiProviders);
  });

  it('should return empty results when no messages exist', async () => {
    const result = await MessagesService.getMessages({
      pagination: { page: 1, limit: 10 },
      sort: { field: 'createdAt', direction: 'desc' },
    });

    expect(result).toEqual({
      messages: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('should return null when message does not exist', async () => {
    const result = await MessagesService.getMessageById('non-existent-id');
    expect(result).toBeNull();
  });

  it('should return empty stats when no messages exist', async () => {
    const stats = await MessagesService.getMessageStats();
    
    expect(stats).toEqual({
      total: 0,
      totalTokens: 0,
      avgResponseTime: 0,
      errorRate: 0,
    });
  });

  it('should validate pagination parameters', async () => {
    const result = await MessagesService.getMessages({
      pagination: { page: -1, limit: 1000 }, // Invalid values
      sort: { field: 'createdAt', direction: 'desc' },
    });

    // Should clamp to valid ranges
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100); // Max limit
  });
});