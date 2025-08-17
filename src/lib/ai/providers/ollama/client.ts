/**
 * Ollama Client for model discovery and management
 *
 * This custom implementation provides utilities for:
 * - Discovering available models on an Ollama server
 * - Testing connectivity to Ollama instances
 * - Managing model lifecycle operations
 */

import { createLogger } from '../../../utils/logger';

const logger = createLogger('OllamaClient');

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

/**
 * Client for interacting with Ollama API
 */
export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Test connectivity to Ollama server
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Ollama server responded with status ${response.status}: ${response.statusText}`,
        };
      }

      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          return {
            success: false,
            error: 'Connection timeout - Ollama server may not be running or reachable',
          };
        }
        return {
          success: false,
          error: `Connection failed: ${error.message}`,
        };
      }
      return {
        success: false,
        error: 'Unknown connection error',
      };
    }
  }

  /**
   * Discover available models from Ollama server
   */
  async discoverModels(): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(
          `Failed to fetch models from Ollama: ${response.status} ${response.statusText}`
        );
        return [];
      }

      const data: OllamaListResponse = await response.json();
      return data.models?.map(model => model.name) || [];
    } catch (error) {
      logger.warn('Failed to discover Ollama models:', error);
      return [];
    }
  }

  /**
   * Get detailed information about available models
   */
  async getModelDetails(): Promise<OllamaModel[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(
          `Failed to fetch model details from Ollama: ${response.status} ${response.statusText}`
        );
        return [];
      }

      const data: OllamaListResponse = await response.json();
      return data.models || [];
    } catch (error) {
      logger.warn('Failed to get Ollama model details:', error);
      return [];
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.discoverModels();
    return models.includes(modelName);
  }

  /**
   * Get server version and info
   */
  async getServerInfo(): Promise<{ version?: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { error: `Server responded with status ${response.status}` };
      }

      const data = await response.json();
      return { version: data.version || 'unknown' };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

