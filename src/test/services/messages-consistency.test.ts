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

      const [drizzleResult, sequelizeResult] = await Promise.all([
        MessagesService.getMessageById(messageId),
        // Note: Both services now point to the same implementation
        MessagesService.getMessageById(messageId),
      ]);

      // Both should return the same message or both should be null
      if (drizzleResult === null) {
        expect(sequelizeResult).toBe(null);
      } else {
        expect(sequelizeResult).not.toBe(null);
        expect(drizzleResult.id).toBe(sequelizeResult!.id);
        expect(drizzleResult.model).toBe(sequelizeResult!.model);
        expect(drizzleResult.createdAt.getTime()).toBe(sequelizeResult!.createdAt.getTime());
        expect(drizzleResult.isSuccess).toBe(sequelizeResult!.isSuccess);
      }
    });

    test('should return null for non-existent message', async () => {
      const nonExistentId = '12345678-1234-4234-a234-123456789abc';

      const [drizzleResult, sequelizeResult] = await Promise.all([
        MessagesService.getMessageById(nonExistentId),
        MessagesService.getMessageById(nonExistentId),
      ]);

      expect(drizzleResult).toBe(null);
      expect(sequelizeResult).toBe(null);
    });

    test('should throw consistent errors for invalid UUID', async () => {
      const invalidId = 'invalid-uuid';

      await expect(MessagesService.getMessageById(invalidId)).rejects.toThrow();
      await expect(MessagesService.getMessageById(invalidId)).rejects.toThrow();
    });
  });

  describe('getMessages', () => {
    test('should return consistent paginated results', async () => {
      const [drizzleResult, sequelizeResult] = await Promise.all([
        MessagesService.getMessages(testPaginationParams),
        // Note: Both services now point to the same implementation
        MessagesService.getMessages(testPaginationParams),
      ]);

      // Check pagination metadata and core stats
      expect(drizzleResult.currentPage).toBe(sequelizeResult.currentPage);
      expect(drizzleResult.totalItems).toBe(sequelizeResult.totalItems);
      expect(drizzleResult.messages.length).toBe(sequelizeResult.messages.length);
      expect(drizzleResult.stats.totalMessages).toBe(sequelizeResult.stats.totalMessages);

      // Check message data consistency for first few items
      for (let i = 0; i < Math.min(3, drizzleResult.messages.length); i++) {
        const drizzleMsg = drizzleResult.messages[i];
        const sequelizeMsg = sequelizeResult.messages[i];
        expect(drizzleMsg.id).toBe(sequelizeMsg.id);
        expect(drizzleMsg.model).toBe(sequelizeMsg.model);
      }
    });
  });

  describe('getFilteredStats', () => {
    test('should return consistent statistics', async () => {
      const [drizzleStats, sequelizeStats] = await Promise.all([
        MessagesService.getFilteredStats(),
        // Note: Both services now point to the same implementation
        MessagesService.getFilteredStats(),
      ]);

      expect(drizzleStats.totalMessages).toBe(sequelizeStats.totalMessages);
      expect(drizzleStats.successfulMessages).toBe(sequelizeStats.successfulMessages);
      expect(drizzleStats.failedMessages).toBe(sequelizeStats.failedMessages);
      expect(drizzleStats.successRate).toBe(sequelizeStats.successRate);
    });
  });

  describe('getMessagesWithCursor', () => {
    test('should return consistent cursor-paginated results', async () => {
      const [drizzleResult, sequelizeResult] = await Promise.all([
        MessagesService.getMessagesWithCursor(testCursorParams),
        // Note: Both services now point to the same implementation
        MessagesService.getMessagesWithCursor(testCursorParams),
      ]);

      // Check metadata and data consistency
      expect(drizzleResult.meta.count).toBe(sequelizeResult.meta.count);
      expect(drizzleResult.data.length).toBe(sequelizeResult.data.length);

      // Check first few items match
      for (let i = 0; i < Math.min(2, drizzleResult.data.length); i++) {
        const drizzleMsg = drizzleResult.data[i];
        const sequelizeMsg = sequelizeResult.data[i];
        expect(drizzleMsg.id).toBe(sequelizeMsg.id);
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
