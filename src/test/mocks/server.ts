import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Mock Service Worker (MSW) server instance for Node.js testing environment.
 * 
 * This server intercepts HTTP requests during tests and returns mocked responses
 * based on the configured handlers. It's used to mock external API calls,
 * particularly the Anthropic API, ensuring tests are fast, reliable, and
 * don't depend on external services.
 * 
 * The server is configured with handlers that define which requests to intercept
 * and what responses to return. This allows us to test various scenarios including
 * success cases, error conditions, and edge cases.
 * 
 * @see https://mswjs.io/docs/getting-started/integrate/node
 */
export const server = setupServer(...handlers);