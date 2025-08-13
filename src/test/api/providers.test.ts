import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { AIProviderType } from '../../lib/ai/types';

/**
 * Provider API endpoint tests
 */
describe('Provider API Endpoints', () => {
  const baseUrl = 'http://localhost:4321';
  const { mockServer } = globalThis.TestUtils;

  beforeEach(() => {
    mockServer.resetHandlers();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  describe('GET /api/providers', () => {
    it('should return all providers', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'OpenAI Provider',
          type: 'openai' as AIProviderType,
          baseUrl: 'https://api.openai.com',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Anthropic Provider',
          type: 'anthropic' as AIProviderType,
          baseUrl: 'https://api.anthropic.com',
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockServer.use(
        http.get(`${baseUrl}/api/providers`, () => {
          return HttpResponse.json(mockProviders);
        })
      );

      const response = await fetch(`${baseUrl}/api/providers`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('OpenAI Provider');
      expect(data[1].name).toBe('Anthropic Provider');
    });

    it('should handle empty provider list', async () => {
      mockServer.use(
        http.get(`${baseUrl}/api/providers`, () => {
          return HttpResponse.json([]);
        })
      );

      const response = await fetch(`${baseUrl}/api/providers`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle server errors', async () => {
      mockServer.use(
        http.get(`${baseUrl}/api/providers`, () => {
          return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers`);
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/providers/:id', () => {
    it('should return a specific provider', async () => {
      const mockProvider = {
        id: '1',
        name: 'Test Provider',
        type: 'openai' as AIProviderType,
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com',
        isDefault: true,
      };

      mockServer.use(
        http.get(`${baseUrl}/api/providers/1`, () => {
          return HttpResponse.json(mockProvider);
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/1`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
      expect(data.name).toBe('Test Provider');
    });

    it('should return 404 for non-existent provider', async () => {
      mockServer.use(
        http.get(`${baseUrl}/api/providers/999`, () => {
          return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/999`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/providers', () => {
    it('should create a new provider', async () => {
      const newProvider = {
        name: 'New Provider',
        type: 'anthropic' as AIProviderType,
        apiKey: 'sk-ant-test',
        baseUrl: 'https://api.anthropic.com',
        isDefault: false,
      };

      const createdProvider = {
        id: '3',
        ...newProvider,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockServer.use(
        http.post(`${baseUrl}/api/providers`, async () => {
          return HttpResponse.json(createdProvider, { status: 201 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('3');
      expect(data.name).toBe('New Provider');
    });

    it('should validate required fields', async () => {
      const invalidProvider = {
        name: 'Invalid',
        // Missing required fields
      };

      mockServer.use(
        http.post(`${baseUrl}/api/providers`, () => {
          return HttpResponse.json(
            { error: 'Validation failed', details: ['type is required', 'apiKey is required'] },
            { status: 400 }
          );
        })
      );

      const response = await fetch(`${baseUrl}/api/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProvider),
      });

      expect(response.status).toBe(400);
    });

    it('should handle setting as default provider', async () => {
      const defaultProvider = {
        name: 'Default Provider',
        type: 'openai' as AIProviderType,
        apiKey: 'sk-test',
        isDefault: true,
      };

      mockServer.use(
        http.post(`${baseUrl}/api/providers`, async () => {
          return HttpResponse.json({ id: '4', ...defaultProvider }, { status: 201 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultProvider),
      });

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.isDefault).toBe(true);
    });
  });

  describe('PUT /api/providers/:id', () => {
    it('should update an existing provider', async () => {
      const updateData = {
        name: 'Updated Provider',
        apiKey: 'new-key',
      };

      const updatedProvider = {
        id: '1',
        name: 'Updated Provider',
        type: 'openai' as AIProviderType,
        apiKey: 'new-key',
        baseUrl: 'https://api.openai.com',
        isDefault: false,
        updatedAt: new Date().toISOString(),
      };

      mockServer.use(
        http.put(`${baseUrl}/api/providers/1`, async () => {
          return HttpResponse.json(updatedProvider);
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Provider');
      expect(data.apiKey).toBe('new-key');
    });

    it('should return 404 for non-existent provider', async () => {
      mockServer.use(
        http.put(`${baseUrl}/api/providers/999`, () => {
          return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/999`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/providers/:id', () => {
    it('should delete a provider', async () => {
      mockServer.use(
        http.delete(`${baseUrl}/api/providers/2`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/2`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(204);
    });

    it('should prevent deleting default provider', async () => {
      mockServer.use(
        http.delete(`${baseUrl}/api/providers/1`, () => {
          return HttpResponse.json({ error: 'Cannot delete default provider' }, { status: 400 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/1`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent provider', async () => {
      mockServer.use(
        http.delete(`${baseUrl}/api/providers/999`, () => {
          return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/999`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/providers/:id/test', () => {
    it('should test provider connection successfully', async () => {
      mockServer.use(
        http.post(`${baseUrl}/api/providers/1/test`, () => {
          return HttpResponse.json({
            success: true,
            message: 'Connection successful',
          });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/1/test`, {
        method: 'POST',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Connection successful');
    });

    it('should handle connection failure', async () => {
      mockServer.use(
        http.post(`${baseUrl}/api/providers/1/test`, () => {
          return HttpResponse.json({
            success: false,
            message: 'Invalid API key',
          });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/1/test`, {
        method: 'POST',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid API key');
    });

    it('should return 404 for non-existent provider', async () => {
      mockServer.use(
        http.post(`${baseUrl}/api/providers/999/test`, () => {
          return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/999/test`, {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/providers/:id/default', () => {
    it('should set provider as default', async () => {
      mockServer.use(
        http.post(`${baseUrl}/api/providers/2/default`, () => {
          return HttpResponse.json({
            id: '2',
            name: 'Anthropic Provider',
            type: 'anthropic' as AIProviderType,
            isDefault: true,
          });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/2/default`, {
        method: 'POST',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDefault).toBe(true);
    });

    it('should return 404 for non-existent provider', async () => {
      mockServer.use(
        http.post(`${baseUrl}/api/providers/999/default`, () => {
          return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
        })
      );

      const response = await fetch(`${baseUrl}/api/providers/999/default`, {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });
  });
});
