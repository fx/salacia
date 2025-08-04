/**
 * Test configuration constants
 */

export const TEST_CONFIG = {
  api: {
    baseUrl: 'http://localhost:4321',
    timeout: 10000,
  },
  anthropic: {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-haiku-20240307',
  },
  models: {
    haiku: 'claude-3-haiku-20240307',
    sonnet: 'claude-3-sonnet-20240229',
    opus: 'claude-3-opus-20240229',
  },
} as const;
