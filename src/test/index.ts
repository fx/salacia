/**
 * Salacia Test Utilities
 *
 * This module provides comprehensive testing utilities for the Salacia AI API service.
 * It includes request builders, response validators, mock data generators, and testing helpers
 * designed to work seamlessly with LLM assistants and automated testing workflows.
 *
 * The utilities are optimized for:
 * - API endpoint testing with proper Anthropic API compatibility
 * - Request/response validation and mocking
 * - Streaming response handling and validation
 * - Type-safe test data generation
 * - Integration with modern testing frameworks
 *
 * @example
 * ```typescript
 * import {
 *   createAnthropicTestRequest,
 *   TEST_REQUESTS,
 *   ResponseValidators,
 *   parseJsonResponse
 * } from './test';
 *
 * // Create a test request
 * const request = createAnthropicTestRequest(TEST_REQUESTS.basicCompletion());
 *
 * // Send request and validate response
 * const response = await endpoint.POST({ request });
 * const isValid = ResponseValidators.isJsonResponse(response);
 * const data = await parseJsonResponse(response);
 * ```
 *
 * @module test
 */

// Export request utilities and builders
export {
  createTestRequest,
  createAnthropicTestRequest,
  MessageBuilder,
  type TestRequestOptions,
} from './utils/request-helpers';

// Export constants and configuration
export {
  DEFAULT_TEST_HEADERS,
  TEST_REQUEST_CONFIGS,
  HTTP_STATUS,
  TEST_MESSAGES,
  TEST_REQUESTS,
} from './utils/request-helpers';

// Export response utilities and validators
export {
  ResponseValidators,
  parseJsonResponse,
  parseStreamingResponse,
} from './utils/request-helpers';
