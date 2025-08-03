/**
 * Test setup and configuration
 * 
 * This file provides centralized test configuration, utilities, and MSW setup
 * for infrastructure testing of the AI service layer.
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';

// Re-export config
export { TEST_CONFIG } from './config';

// Basic MSW server setup (handlers will be added in follow-up PRs)
export const server = setupServer();

// Test utilities
export const testUtils = {
  /**
   * Generate a unique test ID
   */
  generateTestId: (): string => {
    return `test_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  },

  /**
   * Create a delay for testing async operations
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Mock console methods to suppress logs during tests
   */
  mockConsole: () => {
    const originalConsole = { ...console };
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
    return originalConsole;
  },

  /**
   * Restore console methods
   */
  restoreConsole: (originalConsole: typeof console) => {
    Object.assign(console, originalConsole);
  },
};

// Setup MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

// Reset MSW handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Cleanup MSW server
afterAll(() => {
  server.close();
});