import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIContext } from 'astro';
import { GET as sseMessagesHandler } from '../pages/api/sse/messages.js';
import { broker } from '../lib/realtime/broker.js';

// Mock the realtime broker
vi.mock('../lib/realtime/broker.js', () => ({
  broker: {
    subscribe: vi.fn().mockReturnValue(() => {
      /* unsubscribe function */
    }),
    getEventsSince: vi.fn().mockReturnValue([]),
  },
}));

describe('API Endpoints - SSE Messages', () => {
  let mockRequest: Request;
  let mockContext: Partial<APIContext>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock request
    mockRequest = new Request('http://localhost:4321/api/sse/messages', {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    });

    mockContext = {
      request: mockRequest,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/sse/messages', () => {
    it('should return SSE response with correct headers', async () => {
      // Mock setup handled in vi.mock() above

      const response = await sseMessagesHandler(mockContext as APIContext);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should subscribe to message:created events', async () => {
      const mockedBroker = vi.mocked(broker);
      const mockUnsubscribe = vi.fn();
      mockedBroker.subscribe.mockReturnValue(mockUnsubscribe);

      await sseMessagesHandler(mockContext as APIContext);

      expect(mockedBroker.subscribe).toHaveBeenCalledWith('message:created', expect.any(Function));
    });

    it('should handle Last-Event-ID from header', async () => {
      const lastEventId = 'event-123';
      const requestWithLastEventId = new Request('http://localhost:4321/api/sse/messages', {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Last-Event-ID': lastEventId,
        },
      });

      const contextWithLastEventId = {
        ...mockContext,
        request: requestWithLastEventId,
      };

      const mockedBroker = vi.mocked(broker);
      // Mock setup handled in vi.mock() above

      await sseMessagesHandler(contextWithLastEventId as APIContext);

      expect(mockedBroker.getEventsSince).toHaveBeenCalledWith(lastEventId);
    });

    it('should handle Last-Event-ID from query parameter', async () => {
      const lastEventId = 'event-456';
      const requestWithQueryParam = new Request(
        `http://localhost:4321/api/sse/messages?lastEventId=${lastEventId}`,
        {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
          },
        }
      );

      const contextWithQueryParam = {
        ...mockContext,
        request: requestWithQueryParam,
      };

      const mockedBroker = vi.mocked(broker);
      // Mock setup handled in vi.mock() above

      await sseMessagesHandler(contextWithQueryParam as APIContext);

      expect(mockedBroker.getEventsSince).toHaveBeenCalledWith(lastEventId);
    });

    it('should replay missed events when Last-Event-ID is provided', async () => {
      const lastEventId = 'event-123';
      const missedEvents = [
        {
          id: 'event-124',
          type: 'message:created' as const,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          data: {
            id: 'msg-124',
            createdAt: new Date('2024-01-01T10:00:00Z'),
            model: 'claude-3-sonnet',
            statusCode: 200,
          },
        },
        {
          id: 'event-125',
          type: 'message:created' as const,
          createdAt: new Date('2024-01-01T10:01:00Z'),
          data: {
            id: 'msg-125',
            createdAt: new Date('2024-01-01T10:01:00Z'),
            model: 'claude-3-haiku',
            statusCode: 200,
          },
        },
      ];

      const requestWithLastEventId = new Request('http://localhost:4321/api/sse/messages', {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Last-Event-ID': lastEventId,
        },
      });

      const contextWithLastEventId = {
        ...mockContext,
        request: requestWithLastEventId,
      };

      const mockedBroker = vi.mocked(broker);
      mockedBroker.getEventsSince.mockReturnValue(missedEvents);

      const response = await sseMessagesHandler(contextWithLastEventId as APIContext);

      expect(mockedBroker.getEventsSince).toHaveBeenCalledWith(lastEventId);
      expect(response).toBeInstanceOf(Response);
      expect(response.body).toBeInstanceOf(ReadableStream);
    });

    it('should handle connection without Last-Event-ID', async () => {
      const mockedBroker = vi.mocked(broker);
      // Mock setup handled in vi.mock() above

      const response = await sseMessagesHandler(mockContext as APIContext);

      expect(mockedBroker.getEventsSince).not.toHaveBeenCalled();
      expect(response).toBeInstanceOf(Response);
      expect(response.body).toBeInstanceOf(ReadableStream);
    });
  });
});
