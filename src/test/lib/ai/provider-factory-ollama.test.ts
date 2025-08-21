import { describe, it, expect } from 'vitest';
import { ProviderFactory } from '../../../lib/ai/provider-factory';
import type { EnhancedProviderConfig } from '../../../lib/ai/types';

describe('ProviderFactory - Ollama Support', () => {
  describe('getDefaultModel', () => {
    it('should return default model for ollama', () => {
      const model = ProviderFactory.getDefaultModel('ollama');
      expect(model).toBe('llama3.2');
    });
  });

  describe('getAvailableModels', () => {
    it('should return ollama model list', () => {
      const models = ProviderFactory.getAvailableModels('ollama');
      expect(models).toContain('llama3.2');
      expect(models).toContain('mistral');
      expect(models).toContain('codellama');
      expect(models.length).toBeGreaterThan(5);
    });
  });

  describe('isModelSupported', () => {
    it('should validate ollama models correctly', () => {
      expect(ProviderFactory.isModelSupported('ollama', 'llama3.2')).toBe(true);
      expect(ProviderFactory.isModelSupported('ollama', 'mistral')).toBe(true);
      expect(ProviderFactory.isModelSupported('ollama', 'nonexistent-model')).toBe(false);
    });
  });

  describe('getAuthenticationCredentials', () => {
    it('should handle ollama providers without API key', async () => {
      const config: EnhancedProviderConfig = {
        id: 'test-id',
        name: 'Test Ollama',
        type: 'ollama',
        authType: 'api_key',
        models: [],
        settings: {
          timeout: 30000,
          maxRetries: 3,
        },
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const credentials = await ProviderFactory.getAuthenticationCredentials(config);
      expect(credentials).toBe('');
    });

    it('should return API key if provided for ollama', async () => {
      const config: EnhancedProviderConfig = {
        id: 'test-id',
        name: 'Test Ollama',
        type: 'ollama',
        authType: 'api_key',
        apiKey: 'test-key',
        models: [],
        settings: {
          timeout: 30000,
          maxRetries: 3,
        },
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const credentials = await ProviderFactory.getAuthenticationCredentials(config);
      expect(credentials).toBe('test-key');
    });
  });

  describe('hasValidAuthentication', () => {
    it('should always return true for ollama providers', async () => {
      const config: EnhancedProviderConfig = {
        id: 'test-id',
        name: 'Test Ollama',
        type: 'ollama',
        authType: 'api_key',
        models: [],
        settings: {
          timeout: 30000,
          maxRetries: 3,
        },
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const hasAuth = await ProviderFactory.hasValidAuthentication(config);
      expect(hasAuth).toBe(true);
    });
  });
});
