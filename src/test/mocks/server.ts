import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for Node.js testing environment
 * 
 * This server instance is used to intercept and mock HTTP requests
 * during testing, ensuring tests don't make real network calls to
 * external APIs.
 * 
 * The server is configured with default handlers but can be
 * extended or modified per test as needed.
 */
export const server = setupServer(...handlers);