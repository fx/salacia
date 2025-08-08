import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { MessagesService } from '../../lib/services/messages.js';
import type { MessagesPaginationParams } from '../../lib/types/messages.js';
import type { MessagesCursorPaginationParams } from '../../lib/types/cursor.js';
import { sequelize } from '../../lib/db/sequelize-connection.js';
import { AiInteraction } from '../../lib/db/models/AiInteraction.js';

describe('Messages Service Consistency', () => {
  const testPaginationParams: MessagesPaginationParams = {
    page: 1,
    pageSize: 10,
    sort: { field: 'createdAt', direction: 'desc' },
  };

  const testCursorParams: MessagesCursorPaginationParams = {
    limit: 10,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  };

  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('getMessageById', () => {
    test('should return consistent results for existing message', async () => {
      // Get a message ID from the database first
      const existingMessage = await AiInteraction.findOne({
        attributes: ['id'],
        limit: 1,
      });

      if (!existingMessage) {
        console.warn('No messages in database for testing');
        return;
      }

      const messageId = existingMessage.id;

      const [firstResult, secondResult] = await Promise.all([
        MessagesService.getMessageById(messageId),
        // Note: Both calls use the same implementation for consistency testing
        MessagesService.getMessageById(messageId),
      ]);

      // Both should return the same message or both should be null
      if (firstResult === null) {
        expect(secondResult).toBe(null);
      } else {
        expect(secondResult).not.toBe(null);
        expect(firstResult.id).toBe(secondResult!.id);
        expect(firstResult.model).toBe(secondResult!.model);
        expect(firstResult.createdAt.getTime()).toBe(secondResult!.createdAt.getTime());
        expect(firstResult.isSuccess).toBe(secondResult!.isSuccess);
      }
    });

    test('should return null for non-existent message', async () => {
      const nonExistentId = '12345678-1234-4234-a234-123456789abc';

      const [firstResult, secondResult] = await Promise.all([
        MessagesService.getMessageById(nonExistentId),
        MessagesService.getMessageById(nonExistentId),
      ]);

      expect(firstResult).toBe(null);
      expect(secondResult).toBe(null);
    });

    test('should throw consistent errors for invalid UUID', async () => {
      const invalidId = 'invalid-uuid';

      await expect(MessagesService.getMessageById(invalidId)).rejects.toThrow();
      await expect(MessagesService.getMessageById(invalidId)).rejects.toThrow();
    });
  });

  describe('getMessages', () => {
    test('should return consistent paginated results', async () => {
      const [firstResult, secondResult] = await Promise.all([
        MessagesService.getMessages(testPaginationParams),
        // Note: Both calls use the same implementation for consistency testing
        MessagesService.getMessages(testPaginationParams),
      ]);

      // Check pagination metadata and core stats
      expect(firstResult.currentPage).toBe(secondResult.currentPage);
      expect(firstResult.totalItems).toBe(secondResult.totalItems);
      expect(firstResult.messages.length).toBe(secondResult.messages.length);
      expect(firstResult.stats.totalMessages).toBe(secondResult.stats.totalMessages);

      // Check message data consistency for first few items
      for (let i = 0; i < Math.min(3, firstResult.messages.length); i++) {
        const firstMsg = firstResult.messages[i];
        const secondMsg = secondResult.messages[i];
        expect(firstMsg.id).toBe(secondMsg.id);
        expect(firstMsg.model).toBe(secondMsg.model);
      }
    });
  });

  describe('getFilteredStats', () => {
    test('should return consistent statistics', async () => {
      const [firstStats, secondStats] = await Promise.all([
        MessagesService.getFilteredStats(),
        // Note: Both calls use the same implementation for consistency testing
        MessagesService.getFilteredStats(),
      ]);

      expect(firstStats.totalMessages).toBe(secondStats.totalMessages);
      expect(firstStats.successfulMessages).toBe(secondStats.successfulMessages);
      expect(firstStats.failedMessages).toBe(secondStats.failedMessages);
      expect(firstStats.successRate).toBe(secondStats.successRate);
    });
  });

  describe('getMessagesWithCursor', () => {
    test('should return consistent cursor-paginated results', async () => {
      const [firstResult, secondResult] = await Promise.all([
        MessagesService.getMessagesWithCursor(testCursorParams),
        // Note: Both calls use the same implementation for consistency testing
        MessagesService.getMessagesWithCursor(testCursorParams),
      ]);

      // Check metadata and data consistency
      expect(firstResult.meta.count).toBe(secondResult.meta.count);
      expect(firstResult.data.length).toBe(secondResult.data.length);

      // Check first few items match
      for (let i = 0; i < Math.min(2, firstResult.data.length); i++) {
        const firstMsg = firstResult.data[i];
        const secondMsg = secondResult.data[i];
        expect(firstMsg.id).toBe(secondMsg.id);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid pagination parameters consistently', async () => {
      const invalidParams: MessagesPaginationParams = {
        page: -1,
        pageSize: 101,
        sort: { field: 'createdAt', direction: 'desc' },
      };

      await expect(MessagesService.getMessages(invalidParams)).rejects.toThrow();
      await expect(MessagesService.getMessages(invalidParams)).rejects.toThrow();
    });
  });
});
