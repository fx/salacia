import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

/**
 * Global test setup file for Salacia test suite
 * 
 * Configures MSW (Mock Service Worker) for API mocking and
 * sets up global test environment configuration.
 */

/**
 * Start MSW server before all tests
 */
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

/**
 * Reset request handlers after each test to ensure test isolation
 */
afterEach(() => {
  server.resetHandlers();
});

/**
 * Clean up and close MSW server after all tests
 */
afterAll(() => {
  server.close();
});

/**
 * Configure global test environment
 */
// Set up any global test configuration here
process.env.NODE_ENV = 'test';