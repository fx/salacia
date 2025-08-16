/**
 * Test setup and configuration
 *
 * This file provides centralized test configuration, utilities, and MSW setup
 * for infrastructure testing of the AI service layer.
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom';

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
    // eslint-disable-next-line no-console
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    // eslint-disable-next-line no-console
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

// Mock HTMLDialogElement for tests
global.HTMLDialogElement = class MockHTMLDialogElement extends HTMLElement {
  open = false;
  showModal = vi.fn(() => { this.open = true; });
  close = vi.fn(() => { this.open = false; });
} as any;

// Setup MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

// Reset MSW handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Cleanup MSW server
afterAll(async () => {
  server.close();
});

/**
 * Global test environment variables and configuration.
 * These are available to all test files.
 */
declare global {
  /**
   * Global test utilities interface for shared test functionality
   */
  var TestUtils: {
    /**
     * Mock server instance for direct access in tests if needed
     */
    mockServer: typeof server;
  };
}

// Make the server available globally for tests that need direct access
globalThis.TestUtils = {
  mockServer: server,
};
