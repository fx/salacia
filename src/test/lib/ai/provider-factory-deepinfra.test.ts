import { describe, it, expect } from 'vitest';
import { ProviderFactory } from '../../../lib/ai/provider-factory';
import type { EnhancedProviderConfig } from '../../../lib/ai/types';

describe('ProviderFactory - DeepInfra Support', () => {
  describe('getDefaultModel', () => {
    it('should return default model for deepinfra', () => {
      const model = ProviderFactory.getDefaultModel('deepinfra');
      expect(model).toBe('meta-llama/Meta-Llama-3.1-8B-Instruct');
    });
  });

  describe('getAvailableModels', () => {
    it('should return deepinfra model list', () => {
      const models = ProviderFactory.getAvailableModels('deepinfra');
      expect(models).toContain('meta-llama/Meta-Llama-3.1-8B-Instruct');
      expect(models).toContain('meta-llama/Meta-Llama-3.1-70B-Instruct');
      expect(models).toContain('deepseek-ai/DeepSeek-R1-Distill-Llama-70B');
      expect(models.length).toBeGreaterThan(5);
    });
  });

  describe('isModelSupported', () => {
    it('should validate deepinfra models correctly', () => {
      expect(
        ProviderFactory.isModelSupported('deepinfra', 'meta-llama/Meta-Llama-3.1-8B-Instruct')
      ).toBe(true);
      expect(
        ProviderFactory.isModelSupported('deepinfra', 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B')
      ).toBe(true);
      expect(ProviderFactory.isModelSupported('deepinfra', 'nonexistent-model')).toBe(false);
    });
  });

  describe('getAuthenticationCredentials', () => {
    it('should require API key for deepinfra providers', async () => {
      const config: EnhancedProviderConfig = {
        id: 'test-id',
        name: 'Test DeepInfra',
        type: 'deepinfra',
        authType: 'api_key',
        apiKey: 'test-api-key',
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
      expect(credentials).toBe('test-api-key');
    });

    it('should throw error when API key is missing for deepinfra', async () => {
      const config: EnhancedProviderConfig = {
        id: 'test-id',
        name: 'Test DeepInfra',
        type: 'deepinfra',
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

      await expect(ProviderFactory.getAuthenticationCredentials(config)).rejects.toThrow(
        'Missing API key for provider Test DeepInfra'
      );
    });
  });

  describe('hasValidAuthentication', () => {
    it('should return true when API key is provided', async () => {
      const config: EnhancedProviderConfig = {
        id: 'test-id',
        name: 'Test DeepInfra',
        type: 'deepinfra',
        authType: 'api_key',
        apiKey: 'test-api-key',
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

    it('should return false when API key is missing', async () => {
      const config: EnhancedProviderConfig = {
        id: 'test-id',
        name: 'Test DeepInfra',
        type: 'deepinfra',
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
      expect(hasAuth).toBe(false);
    });
  });

  describe('mapModelName', () => {
    it('should map claude models to deepinfra equivalents', () => {
      expect(ProviderFactory.mapModelName('deepinfra', 'claude-3-opus-20240229')).toBe(
        'meta-llama/Meta-Llama-3.1-70B-Instruct'
      );
      expect(ProviderFactory.mapModelName('deepinfra', 'claude-3-sonnet-20240229')).toBe(
        'meta-llama/Meta-Llama-3.1-8B-Instruct'
      );
      expect(ProviderFactory.mapModelName('deepinfra', 'claude-3-haiku-20240307')).toBe(
        'meta-llama/Meta-Llama-3.1-8B-Instruct'
      );
    });

    it('should return default model for unmapped models', () => {
      expect(ProviderFactory.mapModelName('deepinfra', 'unknown-model')).toBe(
        'meta-llama/Meta-Llama-3.1-8B-Instruct'
      );
    });
  });
});
