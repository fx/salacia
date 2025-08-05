/**
 * Unit tests for the messages API client.
 * 
 * Tests cover URL parameter building, response parsing, error handling,
 * and network request functionality using MSW for mocking.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  MessagesClient,
  MessagesApiError,
  buildApiUrlParams,
  parseApiResponseDates,
  messagesClient,
  createMessagesClient,
} from '../../lib/api/messages-client.js';
import type { 
  MessagesPaginationParams, 
  MessagesFilterParams,
  MessagesPaginatedResult 
} from '../../lib/types/messages.js';

// Test data
const mockPaginationParams: MessagesPaginationParams = {
  page: 1,
  pageSize: 20,
  sort: {
    field: 'createdAt',
    direction: 'desc',
  },
};

const mockFilterParams: MessagesFilterParams = {
  model: 'gpt-4',
  provider: 'openai',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  hasError: false,
  minTokens: 100,
  maxTokens: 1000,
  minResponseTime: 50,
  maxResponseTime: 5000,
  searchTerm: 'test query',
};

const mockApiResponse: MessagesPaginatedResult = {
  messages: [
    {
      id: '123',
      model: 'gpt-4',
      provider: 'openai',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      responseTime: 1500,
      totalTokens: 500,
      promptTokens: 300,
      completionTokens: 200,
      statusCode: 200,
      error: undefined,
      requestPreview: 'Test request content',
      responsePreview: 'Test response content',
      isSuccess: true,
      request: { messages: [{ role: 'user', content: 'Test' }] },
      response: { choices: [{ message: { content: 'Response' } }] },
    },
  ],
  currentPage: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
  sort: {
    field: 'createdAt',
    direction: 'desc',
  },
  filters: {
    model: 'gpt-4',
    startDate: new Date('2024-01-01'),
  },
  stats: {
    totalMessages: 1,
    successfulMessages: 1,
    failedMessages: 0,
    successRate: 100,
    totalTokens: 500,
    averageResponseTime: 1500,
    mostUsedModel: 'gpt-4',
    uniqueModels: 1,
  },
};

// MSW server setup
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('buildApiUrlParams', () => {
  it('should build URL params with pagination only', () => {
    const params = buildApiUrlParams(mockPaginationParams);
    
    expect(params.get('page')).toBe('1');
    expect(params.get('pageSize')).toBe('20');
    expect(params.get('sortField')).toBe('createdAt');
    expect(params.get('sortDirection')).toBe('desc');
  });

  it('should build URL params with pagination and filters', () => {
    const params = buildApiUrlParams(mockPaginationParams, mockFilterParams);
    
    // Pagination params
    expect(params.get('page')).toBe('1');
    expect(params.get('pageSize')).toBe('20');
    expect(params.get('sortField')).toBe('createdAt');
    expect(params.get('sortDirection')).toBe('desc');
    
    // Filter params
    expect(params.get('model')).toBe('gpt-4');
    expect(params.get('provider')).toBe('openai');
    expect(params.get('startDate')).toBe('2024-01-01');
    expect(params.get('endDate')).toBe('2024-01-31');
    expect(params.get('hasError')).toBe('false');
    expect(params.get('minTokens')).toBe('100');
    expect(params.get('maxTokens')).toBe('1000');
    expect(params.get('minResponseTime')).toBe('50');
    expect(params.get('maxResponseTime')).toBe('5000');
    expect(params.get('searchTerm')).toBe('test query');
  });

  it('should skip undefined filter values', () => {
    const partialFilters: MessagesFilterParams = {
      model: 'gpt-4',
      startDate: new Date('2024-01-01'),
    };
    
    const params = buildApiUrlParams(mockPaginationParams, partialFilters);
    
    expect(params.get('model')).toBe('gpt-4');
    expect(params.get('startDate')).toBe('2024-01-01');
    expect(params.get('provider')).toBeNull();
    expect(params.get('endDate')).toBeNull();
    expect(params.get('hasError')).toBeNull();
  });

  it('should handle boolean false values correctly', () => {
    const filters: MessagesFilterParams = {
      hasError: false,
    };
    
    const params = buildApiUrlParams(mockPaginationParams, filters);
    
    expect(params.get('hasError')).toBe('false');
  });

  it('should handle zero numeric values correctly', () => {
    const filters: MessagesFilterParams = {
      minTokens: 0,
      minResponseTime: 0,
    };
    
    const params = buildApiUrlParams(mockPaginationParams, filters);
    
    expect(params.get('minTokens')).toBe('0');
    expect(params.get('minResponseTime')).toBe('0');
  });
});

describe('parseApiResponseDates', () => {
  it('should parse dates in messages array', () => {
    const rawResponse = {
      ...mockApiResponse,
      messages: [
        {
          ...mockApiResponse.messages[0],
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
    };
    
    const parsed = parseApiResponseDates(rawResponse);
    
    expect(parsed.messages[0].createdAt).toBeInstanceOf(Date);
    expect(parsed.messages[0].createdAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should parse dates in filters', () => {
    const rawResponse = {
      ...mockApiResponse,
      filters: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
    };
    
    const parsed = parseApiResponseDates(rawResponse);
    
    expect(parsed.filters.startDate).toBeInstanceOf(Date);
    expect(parsed.filters.endDate).toBeInstanceOf(Date);
  });

  it('should handle missing dates gracefully', () => {
    const rawResponse = {
      ...mockApiResponse,
      messages: [],
      filters: {},
    };
    
    const parsed = parseApiResponseDates(rawResponse);
    
    expect(parsed.messages).toEqual([]);
    expect(parsed.filters).toEqual({});
  });
});

describe('MessagesApiError', () => {
  it('should create error with all properties', () => {
    const error = new MessagesApiError(
      'Test error',
      400,
      'VALIDATION_ERROR',
      { field: 'model' }
    );
    
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'model' });
    expect(error.name).toBe('MessagesApiError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('MessagesClient', () => {
  let client: MessagesClient;

  beforeEach(() => {
    client = new MessagesClient({ baseUrl: 'http://localhost:3000' });
  });

  describe('getMessages', () => {
    it('should fetch messages successfully', async () => {
      server.use(
        http.get('http://localhost:3000/api/messages', () => {
          return HttpResponse.json({
            ...mockApiResponse,
            messages: [
              {
                ...mockApiResponse.messages[0],
                createdAt: '2024-01-15T10:30:00Z',
              },
            ],
            filters: {
              startDate: '2024-01-01',
            },
          });
        })
      );

      const result = await client.getMessages(mockPaginationParams, mockFilterParams);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('123');
      expect(result.messages[0].createdAt).toBeInstanceOf(Date);
      expect(result.currentPage).toBe(1);
      expect(result.totalItems).toBe(1);
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('http://localhost:3000/api/messages', () => {
          return HttpResponse.json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: { field: 'pageSize' },
            },
            { status: 400 }
          );
        })
      );

      await expect(
        client.getMessages(mockPaginationParams)
      ).rejects.toThrow(MessagesApiError);

      try {
        await client.getMessages(mockPaginationParams);
      } catch (error) {
        expect(error).toBeInstanceOf(MessagesApiError);
        expect((error as MessagesApiError).status).toBe(400);
        expect((error as MessagesApiError).code).toBe('VALIDATION_ERROR');
        expect((error as MessagesApiError).message).toBe('Validation failed');
      }
    });

    it('should handle network errors', async () => {
      server.use(
        http.get('http://localhost:3000/api/messages', () => {
          return HttpResponse.error();
        })
      );

      await expect(
        client.getMessages(mockPaginationParams)
      ).rejects.toThrow(MessagesApiError);

      try {
        await client.getMessages(mockPaginationParams);
      } catch (error) {
        expect(error).toBeInstanceOf(MessagesApiError);
        expect((error as MessagesApiError).code).toBe('NETWORK_ERROR');
        expect((error as MessagesApiError).status).toBe(0);
      }
    });

    it('should handle timeout', async () => {
      const shortTimeoutClient = new MessagesClient({
        baseUrl: 'http://localhost:3000',
        timeout: 10, // Very short timeout
      });

      server.use(
        http.get('http://localhost:3000/api/messages', async () => {
          // Delay longer than timeout
          await new Promise(resolve => setTimeout(resolve, 50));
          return HttpResponse.json(mockApiResponse);
        })
      );

      await expect(
        shortTimeoutClient.getMessages(mockPaginationParams)
      ).rejects.toThrow(MessagesApiError);

      try {
        await shortTimeoutClient.getMessages(mockPaginationParams);
      } catch (error) {
        expect(error).toBeInstanceOf(MessagesApiError);
        expect((error as MessagesApiError).code).toBe('TIMEOUT_ERROR');
        expect((error as MessagesApiError).message).toBe('Request timeout');
      }
    });

    it('should handle non-JSON error responses', async () => {
      server.use(
        http.get('http://localhost:3000/api/messages', () => {
          return new HttpResponse('Internal Server Error', { status: 500 });
        })
      );

      await expect(
        client.getMessages(mockPaginationParams)
      ).rejects.toThrow(MessagesApiError);

      try {
        await client.getMessages(mockPaginationParams);
      } catch (error) {
        expect(error).toBeInstanceOf(MessagesApiError);
        expect((error as MessagesApiError).status).toBe(500);
        expect((error as MessagesApiError).message).toBe('HTTP 500: Internal Server Error');
      }
    });
  });

  describe('getMessage', () => {
    it('should fetch single message successfully', async () => {
      server.use(
        http.get('http://localhost:3000/api/messages/123', () => {
          return HttpResponse.json({
            ...mockApiResponse.messages[0],
            createdAt: '2024-01-15T10:30:00Z',
          });
        })
      );

      const result = await client.getMessage('123');
      
      expect(result.id).toBe('123');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.model).toBe('gpt-4');
    });

    it('should handle 404 errors', async () => {
      server.use(
        http.get('http://localhost:3000/api/messages/nonexistent', () => {
          return HttpResponse.json(
            {
              error: 'Message not found',
              code: 'NOT_FOUND',
            },
            { status: 404 }
          );
        })
      );

      await expect(
        client.getMessage('nonexistent')
      ).rejects.toThrow(MessagesApiError);

      try {
        await client.getMessage('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(MessagesApiError);
        expect((error as MessagesApiError).status).toBe(404);
        expect((error as MessagesApiError).code).toBe('NOT_FOUND');
      }
    });

    it('should encode special characters in ID', async () => {
      const specialId = 'test/id with spaces';
      const encodedId = encodeURIComponent(specialId);
      
      server.use(
        http.get(`http://localhost:3000/api/messages/${encodedId}`, () => {
          return HttpResponse.json({
            ...mockApiResponse.messages[0],
            id: specialId,
            createdAt: '2024-01-15T10:30:00Z',
          });
        })
      );

      const result = await client.getMessage(specialId);
      expect(result.id).toBe(specialId);
    });
  });
});

describe('Default client and factory functions', () => {
  it('should export a default messages client', () => {
    expect(messagesClient).toBeInstanceOf(MessagesClient);
  });

  it('should create custom client with config', () => {
    const customClient = createMessagesClient({
      baseUrl: 'https://api.example.com',
      timeout: 10000,
    });
    
    expect(customClient).toBeInstanceOf(MessagesClient);
    expect(customClient).not.toBe(messagesClient);
  });
});