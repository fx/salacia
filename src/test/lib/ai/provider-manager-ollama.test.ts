import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProviderManager } from '../../../lib/ai/provider-manager';

describe('ProviderManager - Ollama Support', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('discoverOllamaModels', () => {
    it('should discover models from ollama server', async () => {
      const mockModels = {
        models: [{ name: 'llama3.2' }, { name: 'mistral' }, { name: 'codellama' }],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModels),
      } as Response);

      const models = await ProviderManager.discoverOllamaModels('http://localhost:11434');
      expect(models).toEqual(['llama3.2', 'mistral', 'codellama']);
    });

    it('should handle connection errors gracefully', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Connection failed'));

      const models = await ProviderManager.discoverOllamaModels('http://localhost:11434');
      expect(models).toEqual([]);
    });

    it('should use default URL when none provided', async () => {
      const mockModels = { models: [{ name: 'llama3.2' }] };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModels),
      } as Response);

      const models = await ProviderManager.discoverOllamaModels();
      expect(models).toEqual(['llama3.2']);

      // Verify it called the default URL
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('getOllamaModelDetails', () => {
    it('should return detailed model information', async () => {
      const mockModels = {
        models: [
          {
            name: 'llama3.2',
            model: 'llama3.2',
            modified_at: '2024-01-01T00:00:00Z',
            size: 1000000,
            digest: 'sha256:abc123',
            details: {
              parent_model: '',
              format: 'gguf',
              family: 'llama',
              families: ['llama'],
              parameter_size: '3B',
              quantization_level: 'Q4_0',
            },
          },
        ],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModels),
      } as Response);

      const details = await ProviderManager.getOllamaModelDetails('http://localhost:11434');
      expect(details).toHaveLength(1);
      expect(details[0].name).toBe('llama3.2');
      expect(details[0].details.family).toBe('llama');
    });

    it('should handle server errors gracefully', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const details = await ProviderManager.getOllamaModelDetails('http://localhost:11434');
      expect(details).toEqual([]);
    });
  });

  describe('testProvider - Ollama integration', () => {
    it('should test ollama provider connectivity', async () => {
      const ollamaProvider = {
        id: 'ollama-1',
        name: 'Local Ollama',
        type: 'ollama',
        authType: 'api_key' as const,
        baseUrl: 'http://localhost:11434',
        models: [],
        settings: {},
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock successful Ollama response
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await ProviderManager.testProvider(ollamaProvider);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle ollama connection failures', async () => {
      const ollamaProvider = {
        id: 'ollama-1',
        name: 'Local Ollama',
        type: 'ollama',
        authType: 'api_key' as const,
        baseUrl: 'http://localhost:11434',
        models: [],
        settings: {},
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock connection failure
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await ProviderManager.testProvider(ollamaProvider);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });
  });
});

