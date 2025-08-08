import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import { GET as messagesListHandler } from '../pages/api/messages.js';
import { GET as messageDetailHandler } from '../pages/api/messages/[id].js';
import { MessagesSequelizeService } from '../lib/services/messages-sequelize.js';
import { HTTP_STATUS, parseJsonResponse } from './utils/request-helpers.js';
import type { MessageDisplay } from '../lib/types/messages.js';
import type { MessagesCursorPaginationResponse } from '../lib/types/cursor.js';

// Mock the MessagesSequelizeService
vi.mock('../lib/services/messages-sequelize.js', () => ({
  MessagesSequelizeService: {
    getMessagesWithCursor: vi.fn(),
    getMessageById: vi.fn(),
  },
}));

// Mock the logger to avoid console output during tests
vi.mock('../lib/utils/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('API Endpoints - Messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/messages', () => {
    const mockCursorResult: MessagesCursorPaginationResponse<MessageDisplay> = {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          model: 'claude-3-sonnet',
          provider: 'anthropic',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          responseTime: 250,
          totalTokens: 100,
          promptTokens: 50,
          completionTokens: 50,
          statusCode: 200,
          requestPreview: 'Hello world',
          responsePreview: 'Hi there!',
          isSuccess: true,
          request: { content: 'Hello world' },
          response: { content: 'Hi there!' },
        },
      ],
      meta: {
        count: 1,
        limit: 20,
        hasMore: false,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      },
      cursors: {
        next: undefined,
        prev: undefined,
      },
    };

    it('should return cursor-paginated messages with default parameters', async () => {
      vi.mocked(MessagesSequelizeService.getMessagesWithCursor).mockResolvedValue(mockCursorResult);

      const url = new globalThis.URL('http://localhost:4321/api/messages');
      const response = await messagesListHandler({ url } as APIContext);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('x-response-time')).toMatch(/\d+ms/);

      const data = await parseJsonResponse<{
        items: MessageDisplay[];
        hasMore: boolean;
        nextCursor?: string;
        prevCursor?: string;
      }>(response);

      // Check the structure matches the simplified response format
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe(mockCursorResult.data[0].id);
      expect(data.items[0].model).toBe(mockCursorResult.data[0].model);
      expect(data.hasMore).toBe(false);
      expect(data.nextCursor).toBeUndefined();
      expect(data.prevCursor).toBeUndefined();

      expect(MessagesSequelizeService.getMessagesWithCursor).toHaveBeenCalledWith(
        {
          limit: 20,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        },
        {}
      );
    });

    it('should handle custom pagination parameters', async () => {
      vi.mocked(MessagesSequelizeService.getMessagesWithCursor).mockResolvedValue(mockCursorResult);

      const url = new globalThis.URL(
        'http://localhost:4321/api/messages?limit=50&sortBy=id&sortDirection=asc&cursor=abc123'
      );
      const response = await messagesListHandler({ url } as APIContext);

      expect(response.status).toBe(HTTP_STATUS.OK);

      expect(MessagesSequelizeService.getMessagesWithCursor).toHaveBeenCalledWith(
        {
          limit: 50,
          cursor: 'abc123',
          sortBy: 'id',
          sortDirection: 'asc',
        },
        {}
      );
    });

    it('should handle filter parameters', async () => {
      vi.mocked(MessagesSequelizeService.getMessagesWithCursor).mockResolvedValue(mockCursorResult);

      const url = new globalThis.URL(
        'http://localhost:4321/api/messages?model=claude-3-sonnet&hasError=false&minTokens=10&searchTerm=hello'
      );
      const response = await messagesListHandler({ url } as APIContext);

      expect(response.status).toBe(HTTP_STATUS.OK);

      expect(MessagesSequelizeService.getMessagesWithCursor).toHaveBeenCalledWith(
        {
          limit: 20,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        },
        {
          model: 'claude-3-sonnet',
          hasError: false,
          minTokens: 10,
          searchTerm: 'hello',
        }
      );
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const url = new globalThis.URL('http://localhost:4321/api/messages?limit=200');
      const response = await messagesListHandler({ url } as APIContext);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Invalid limit parameter. Must be a number between 1 and 100.',
      });
    });

    it('should return 503 for database errors', async () => {
      const error = new Error('database connection failed');
      vi.mocked(MessagesSequelizeService.getMessagesWithCursor).mockRejectedValue(error);

      const url = new globalThis.URL('http://localhost:4321/api/messages');
      const response = await messagesListHandler({ url } as APIContext);

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'DATABASE_ERROR',
        message: 'Database operation failed: retrieve messages',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const error = new Error('Unexpected error');
      vi.mocked(MessagesSequelizeService.getMessagesWithCursor).mockRejectedValue(error);

      const url = new globalThis.URL('http://localhost:4321/api/messages');
      const response = await messagesListHandler({ url } as APIContext);

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'DATABASE_ERROR',
        message: 'Database operation failed: retrieve messages',
      });
    });
  });

  describe('GET /api/messages/[id]', () => {
    const mockMessage: MessageDisplay = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      model: 'claude-3-sonnet',
      provider: 'anthropic',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      responseTime: 250,
      totalTokens: 100,
      promptTokens: 50,
      completionTokens: 50,
      statusCode: 200,
      requestPreview: 'Hello world',
      responsePreview: 'Hi there!',
      isSuccess: true,
      request: { content: 'Hello world' },
      response: { content: 'Hi there!' },
    };

    it('should return message details for valid ID', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(MessagesSequelizeService.getMessageById).mockResolvedValue(mockMessage);

      const response = await messageDetailHandler({
        params: { id: messageId },
      } as unknown as APIContext);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('x-response-time')).toMatch(/\d+ms/);

      const data = await parseJsonResponse<MessageDisplay>(response);

      // Check the structure matches, accounting for date serialization
      expect(data.id).toBe(mockMessage.id);
      expect(data.model).toBe(mockMessage.model);
      expect(data.provider).toBe(mockMessage.provider);
      expect(data.responseTime).toBe(mockMessage.responseTime);
      expect(data.totalTokens).toBe(mockMessage.totalTokens);
      expect(data.isSuccess).toBe(mockMessage.isSuccess);

      expect(MessagesSequelizeService.getMessageById).toHaveBeenCalledWith(messageId);
    });

    it('should return 400 for missing ID parameter', async () => {
      const response = await messageDetailHandler({
        params: {} as { id: string },
      } as unknown as APIContext);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: 'Message ID is required',
      });

      expect(MessagesSequelizeService.getMessageById).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent message', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(MessagesSequelizeService.getMessageById).mockResolvedValue(null);

      const response = await messageDetailHandler({
        params: { id: messageId },
      } as unknown as APIContext);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'NOT_FOUND',
        message: `Message not found with identifier: ${messageId}`,
      });
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';
      const error = new Error('Invalid UUID format: invalid-uuid');
      vi.mocked(MessagesSequelizeService.getMessageById).mockRejectedValue(error);

      const response = await messageDetailHandler({
        params: { id: invalidId },
      } as unknown as APIContext);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'INVALID_UUID',
        message: 'The provided ID is not a valid UUID format: invalid-uuid',
      });
    });

    it('should return 503 for database errors', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('database connection timeout');
      vi.mocked(MessagesSequelizeService.getMessageById).mockRejectedValue(error);

      const response = await messageDetailHandler({
        params: { id: messageId },
      } as unknown as APIContext);

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'DATABASE_ERROR',
        message: 'Database operation failed: retrieve message 123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Unexpected error');
      vi.mocked(MessagesSequelizeService.getMessageById).mockRejectedValue(error);

      const response = await messageDetailHandler({
        params: { id: messageId },
      } as unknown as APIContext);

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);

      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'DATABASE_ERROR',
        message: 'Database operation failed: retrieve message 123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should include response time header in all responses', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(MessagesSequelizeService.getMessageById).mockResolvedValue(mockMessage);

      const response = await messageDetailHandler({
        params: { id: messageId },
      } as unknown as APIContext);

      const responseTimeHeader = response.headers.get('x-response-time');
      expect(responseTimeHeader).toBeTruthy();
      expect(responseTimeHeader).toMatch(/^\d+ms$/);
    });

    it('should include timestamp in error responses', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(MessagesSequelizeService.getMessageById).mockResolvedValue(null);

      const response = await messageDetailHandler({
        params: { id: messageId },
      } as unknown as APIContext);

      const data = await parseJsonResponse<{ timestamp: string; error: string; message: string }>(
        response
      );
      expect(data.timestamp).toBeTruthy();
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });
});
