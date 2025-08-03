import { http } from 'msw';

/**
 * MSW request handlers for mocking external API calls during testing.
 * 
 * This file contains HTTP request handlers that intercept outgoing requests
 * and return mocked responses. Currently contains basic setup for Anthropic API
 * endpoints that will be expanded in subsequent PRs.
 * 
 * Handlers follow the MSW pattern of matching request patterns and returning
 * mock responses that simulate real API behavior including success cases,
 * error conditions, and streaming responses.
 * 
 * @see https://mswjs.io/docs/concepts/request-handler
 */

/**
 * Basic health check handler to verify MSW is working
 */
const healthHandler = http.get('*/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

/**
 * Collection of all MSW request handlers.
 * This array will be expanded with Anthropic API handlers in subsequent PRs.
 */
export const handlers = [
  healthHandler
];