import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

/**
 * Global test setup configuration for Vitest.
 * 
 * Sets up MSW (Mock Service Worker) server for intercepting HTTP requests
 * during tests. This allows us to mock external API calls and ensure
 * consistent, reliable test behavior.
 * 
 * The setup follows the standard MSW testing pattern:
 * - Start server before all tests
 * - Reset handlers after each test to ensure test isolation
 * - Close server after all tests complete
 * 
 * @see https://mswjs.io/docs/getting-started/integrate/node
 */

/**
 * Start the MSW server before all tests run.
 * This enables request interception for all test suites.
 */
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error'
  });
});

/**
 * Reset MSW handlers after each test to ensure test isolation.
 * This prevents one test's mocked responses from affecting another test.
 */
afterEach(() => {
  server.resetHandlers();
});

/**
 * Close the MSW server after all tests complete.
 * This cleans up resources and ensures proper test teardown.
 */
afterAll(() => {
  server.close();
});

/**
 * Global test environment variables and configuration.
 * These are available to all test files.
 */
declare global {
  /**
   * Global test utilities namespace for shared test functionality
   */
  namespace TestUtils {
    /**
     * Mock server instance for direct access in tests if needed
     */
    const mockServer: typeof server;
  }
}

// Make the server available globally for tests that need direct access
globalThis.TestUtils = {
  mockServer: server
};