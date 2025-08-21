import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaClient } from '../../../lib/ai/providers/ollama/client';

describe('OllamaClient', () => {
  let client: OllamaClient;

  beforeEach(() => {
    client = new OllamaClient('http://localhost:11434');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('testConnection', () => {
    it('should return success for valid response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response);

      const result = await client.testConnection();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for failed response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await client.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await client.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('discoverModels', () => {
    it('should return model list for valid response', async () => {
      const mockModels = {
        models: [{ name: 'llama3.2' }, { name: 'mistral' }, { name: 'codellama' }],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModels),
      } as Response);

      const result = await client.discoverModels();
      expect(result).toEqual(['llama3.2', 'mistral', 'codellama']);
    });

    it('should return empty array for failed response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.discoverModels();
      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.discoverModels();
      expect(result).toEqual([]);
    });
  });

  describe('isModelAvailable', () => {
    it('should return true if model exists', async () => {
      const mockModels = {
        models: [{ name: 'llama3.2' }, { name: 'mistral' }],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModels),
      } as Response);

      const result = await client.isModelAvailable('llama3.2');
      expect(result).toBe(true);
    });

    it('should return false if model does not exist', async () => {
      const mockModels = {
        models: [{ name: 'llama3.2' }, { name: 'mistral' }],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModels),
      } as Response);

      const result = await client.isModelAvailable('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getServerInfo', () => {
    it('should return version info for valid response', async () => {
      const mockVersion = { version: '0.1.20' };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersion),
      } as Response);

      const result = await client.getServerInfo();
      expect(result.version).toBe('0.1.20');
      expect(result.error).toBeUndefined();
    });

    it('should return error for failed response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.getServerInfo();
      expect(result.version).toBeUndefined();
      expect(result.error).toContain('404');
    });
  });
});
