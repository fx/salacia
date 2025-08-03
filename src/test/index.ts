/**
 * Test utilities and fixtures for Salacia API testing
 * 
 * This module provides a centralized export of all testing utilities,
 * fixtures, and mock services for the Salacia codebase.
 */

// Mock service layer
export { server } from './mocks/server';
export { handlers, anthropicHandlers, openaiHandlers } from './mocks/handlers';

// Request utilities
export {
  createMockFetch,
  createTestHeaders,
  createHeadersInstance,
  createMockRequest,
  parseJsonResponse,
  assertions,
  DEFAULT_TEST_HEADERS
} from './utils/request-helpers';

// Anthropic request fixtures
export {
  createMessage,
  createAnthropicRequest,
  createStreamingRequest,
  createRequestWithSystem,
  createConversationRequest,
  createMultimodalRequest,
  requestFixtures
} from './fixtures/anthropic-requests';

// Anthropic response fixtures
export {
  generateMessageId,
  createAnthropicResponse,
  createStreamingResponse,
  createErrorResponse,
  responseFixtures
} from './fixtures/anthropic-responses';