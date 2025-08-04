import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as messagesListHandler } from '../pages/api/messages.js';
import { GET as messageDetailHandler } from '../pages/api/messages/[id].js';
import { MessagesService } from '../lib/services/messages.js';
import { createTestRequest, HTTP_STATUS, parseJsonResponse } from './utils/request-helpers.js';
import type { MessagesPaginatedResult, MessageDisplay } from '../lib/types/messages.js';

// Mock the MessagesService
vi.mock('../lib/services/messages.js', () => ({
  MessagesService: {
    getMessages: vi.fn(),
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
    const mockPaginatedResult: MessagesPaginatedResult = {
      messages: [
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
      currentPage: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      sort: { field: 'createdAt', direction: 'desc' },
      filters: {},
      stats: {
        totalMessages: 1,
        successfulMessages: 1,
        failedMessages: 0,
        successRate: 100,
        totalTokens: 100,
        averageResponseTime: 250,
        mostUsedModel: 'claude-3-sonnet',
        uniqueModels: 1,
      },
    };

    it('should return paginated messages with default parameters', async () => {
      vi.mocked(MessagesService.getMessages).mockResolvedValue(mockPaginatedResult);

      const url = new URL('http://localhost:4321/api/messages');
      const response = await messagesListHandler({ url });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('x-response-time')).toMatch(/\d+ms/);

      const data = await parseJsonResponse<MessagesPaginatedResult>(response);
      
      // Check the structure matches, accounting for date serialization
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].id).toBe(mockPaginatedResult.messages[0].id);
      expect(data.messages[0].model).toBe(mockPaginatedResult.messages[0].model);
      expect(data.currentPage).toBe(1);
      expect(data.pageSize).toBe(20);
      expect(data.totalItems).toBe(1);

      expect(MessagesService.getMessages).toHaveBeenCalledWith(
        {
          page: 1,
          pageSize: 20,
          sort: { field: 'createdAt', direction: 'desc' },
        },
        {}
      );
    });

    it('should handle custom pagination parameters', async () => {
      vi.mocked(MessagesService.getMessages).mockResolvedValue(mockPaginatedResult);

      const url = new URL('http://localhost:4321/api/messages?page=2&pageSize=50&sortField=model&sortDirection=asc');
      const response = await messagesListHandler({ url });

      expect(response.status).toBe(HTTP_STATUS.OK);

      expect(MessagesService.getMessages).toHaveBeenCalledWith(
        {
          page: 2,
          pageSize: 50,
          sort: { field: 'model', direction: 'asc' },
        },
        {}
      );
    });

    it('should handle filter parameters', async () => {
      vi.mocked(MessagesService.getMessages).mockResolvedValue(mockPaginatedResult);

      const url = new URL('http://localhost:4321/api/messages?model=claude-3-sonnet&hasError=false&minTokens=10&searchTerm=hello');
      const response = await messagesListHandler({ url });

      expect(response.status).toBe(HTTP_STATUS.OK);

      expect(MessagesService.getMessages).toHaveBeenCalledWith(
        {
          page: 1,
          pageSize: 20,
          sort: { field: 'createdAt', direction: 'desc' },
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
      const error = new Error('Page number must be greater than 0');
      vi.mocked(MessagesService.getMessages).mockRejectedValue(error);

      const url = new URL('http://localhost:4321/api/messages?page=0');
      const response = await messagesListHandler({ url });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Invalid request parameters',
        message: 'Page number must be greater than 0',
      });
    });

    it('should return 503 for database errors', async () => {
      const error = new Error('database connection failed');
      vi.mocked(MessagesService.getMessages).mockRejectedValue(error);

      const url = new URL('http://localhost:4321/api/messages');
      const response = await messagesListHandler({ url });

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Database error',
        message: 'Unable to retrieve messages at this time',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const error = new Error('Unexpected error');
      vi.mocked(MessagesService.getMessages).mockRejectedValue(error);

      const url = new URL('http://localhost:4321/api/messages');
      const response = await messagesListHandler({ url });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
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
      vi.mocked(MessagesService.getMessageById).mockResolvedValue(mockMessage);

      const response = await messageDetailHandler({ 
        params: { id: messageId } 
      });

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

      expect(MessagesService.getMessageById).toHaveBeenCalledWith(messageId);
    });

    it('should return 400 for missing ID parameter', async () => {
      const response = await messageDetailHandler({ 
        params: {} as { id: string }
      });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Missing parameter',
        message: 'Message ID is required',
      });

      expect(MessagesService.getMessageById).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent message', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(MessagesService.getMessageById).mockResolvedValue(null);

      const response = await messageDetailHandler({ 
        params: { id: messageId } 
      });

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Message not found',
        message: `No message found with ID: ${messageId}`,
      });
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';
      const error = new Error('Invalid UUID format: invalid-uuid');
      vi.mocked(MessagesService.getMessageById).mockRejectedValue(error);

      const response = await messageDetailHandler({ 
        params: { id: invalidId } 
      });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Invalid message ID',
        message: 'The provided message ID is not a valid UUID format',
      });
    });

    it('should return 503 for database errors', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('database connection timeout');
      vi.mocked(MessagesService.getMessageById).mockRejectedValue(error);

      const response = await messageDetailHandler({ 
        params: { id: messageId } 
      });

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Database error',
        message: 'Unable to retrieve message at this time',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Unexpected error');
      vi.mocked(MessagesService.getMessageById).mockRejectedValue(error);

      const response = await messageDetailHandler({ 
        params: { id: messageId } 
      });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      
      const data = await parseJsonResponse(response);
      expect(data).toMatchObject({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      });
    });

    it('should include response time header in all responses', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(MessagesService.getMessageById).mockResolvedValue(mockMessage);

      const response = await messageDetailHandler({ 
        params: { id: messageId } 
      });

      const responseTimeHeader = response.headers.get('x-response-time');
      expect(responseTimeHeader).toBeTruthy();
      expect(responseTimeHeader).toMatch(/^\d+ms$/);
    });

    it('should include timestamp in error responses', async () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(MessagesService.getMessageById).mockResolvedValue(null);

      const response = await messageDetailHandler({ 
        params: { id: messageId } 
      });

      const data = await parseJsonResponse(response);
      expect(data.timestamp).toBeTruthy();
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });
});