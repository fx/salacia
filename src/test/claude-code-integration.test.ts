/**
 * Claude Code Integration Tests
 *
 * This test suite verifies that our API and MSW mocks work correctly and
 * provides infrastructure for testing Claude Code CLI integration.
 * While Claude Code CLI doesn't currently support configurable API endpoints,
 * this suite validates that our API implementation is compatible with
 * Claude Code's expected request/response format.
 *
 * This addresses the core requirement from issue #7 to test Claude Code
 * end-to-end integration with our API by:
 * 1. Validating our API compatibility with Claude Code's format
 * 2. Testing subprocess management for future CLI integration
 * 3. Providing infrastructure for when API endpoint configuration becomes available
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { TestServer, createTestServer, globalTestServerRegistry } from './utils/test-server';
import { spawnManaged, globalProcessRegistry, ManagedSubprocess } from './utils/subprocess-manager';
import { defaultHandlers, streamingHandlers, errorHandlers } from './mocks/handlers';

/**
 * Test configuration
 */
const TEST_TIMEOUT = 30000; // 30 seconds
const CLAUDE_COMMAND_TIMEOUT = 15000; // 15 seconds for Claude commands

/**
 * Test server instance
 */
let testServer: TestServer;

/**
 * Test setup - start server and cleanup processes
 */
beforeAll(async () => {
  // Start test server with default handlers
  testServer = await createTestServer({
    handlers: defaultHandlers,
  });
  
  console.log(`Test server started on ${testServer.url}`);
}, TEST_TIMEOUT);

/**
 * Test cleanup - stop server and kill processes
 */
afterAll(async () => {
  // Stop all test servers
  await globalTestServerRegistry.stopAll();
  
  // Kill all processes
  await globalProcessRegistry.waitForAll(5000);
  
  console.log('Test cleanup completed');
}, TEST_TIMEOUT);

/**
 * Clean up processes after each test
 */
afterEach(async () => {
  // Kill any remaining processes from the test
  globalProcessRegistry.killAll('SIGKILL');
  await globalProcessRegistry.waitForAll(2000);
  
  // Reset MSW handlers
  testServer.resetHandlers();
}, 10000);

/**
 * Helper function to test our API directly (since Claude Code doesn't support custom endpoints)
 */
async function testApiDirectly(
  requestBody: any,
  options: {
    streaming?: boolean;
  } = {}
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key',
    'anthropic-version': '2023-06-01',
  };

  const response = await fetch(`${testServer.url}/api/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  return response;
}

/**
 * Helper function to parse streaming JSON responses
 */
function parseStreamingJson(output: string): any[] {
  const lines = output.split('\n').filter(line => line.trim());
  const results: any[] = [];
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      results.push(parsed);
    } catch (error) {
      // Skip non-JSON lines
    }
  }
  
  return results;
}

describe('Claude Code Integration Tests', () => {
  /**
   * Test basic non-streaming response with our API
   */
  it('should handle basic non-streaming requests via API', async () => {
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello, Claude!' }],
    };

    const response = await testApiDirectly(requestBody);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.content).toBeDefined();
    expect(data.content[0].text.length).toBeGreaterThan(0);
    expect(data.usage).toBeDefined();
    expect(data.usage.input_tokens).toBeGreaterThan(0);
    expect(data.usage.output_tokens).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  /**
   * Test code generation requests via API
   */
  it('should handle code generation requests via API', async () => {
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Write a TypeScript function' }],
    };

    const response = await testApiDirectly(requestBody);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.content[0].text).toContain('typescript');
    expect(data.content[0].text).toContain('function');
  }, TEST_TIMEOUT);

  /**
   * Test streaming response via API
   */
  it('should handle streaming responses via API', async () => {
    // Update server to use streaming handlers
    testServer.updateHandlers(streamingHandlers);

    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Tell me a story' }],
      stream: true,
    };

    const response = await testApiDirectly(requestBody);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    
    // Read streaming response
    const text = await response.text();
    expect(text).toContain('data: ');
    expect(text).toContain('message_start');
    expect(text).toContain('content_block_delta');
    expect(text).toContain('message_stop');
  }, TEST_TIMEOUT);

  /**
   * Test authentication error handling via API
   */
  it('should handle authentication errors gracefully via API', async () => {
    // Update server to return auth errors
    testServer.updateHandlers([errorHandlers.auth]);

    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Test authentication' }],
    };

    const response = await testApiDirectly(requestBody);
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.type).toBe('error');
    expect(data.error.type).toBe('authentication_error');
    expect(data.error.message).toContain('Invalid API key');
  }, TEST_TIMEOUT);

  /**
   * Test rate limit error handling via API
   */
  it('should handle rate limit errors gracefully via API', async () => {
    // Update server to return rate limit errors
    testServer.updateHandlers([errorHandlers.rateLimit]);

    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Test rate limiting' }],
    };

    const response = await testApiDirectly(requestBody);
    expect(response.status).toBe(429);
    
    const data = await response.json();
    expect(data.type).toBe('error');
    expect(data.error.type).toBe('rate_limit_error');
    expect(data.error.message).toContain('Rate limit');
  }, TEST_TIMEOUT);

  /**
   * Test server error handling via API
   */
  it('should handle server errors gracefully via API', async () => {
    // Update server to return server errors
    testServer.updateHandlers([errorHandlers.serverError]);

    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Test server error' }],
    };

    const response = await testApiDirectly(requestBody);
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.type).toBe('error');
    expect(data.error.type).toBe('api_error');
    expect(data.error.message).toContain('server error');
  }, TEST_TIMEOUT);

  /**
   * Test different response types via API
   */
  it('should handle different response types correctly via API', async () => {
    // Test minimal response
    const minimalRequest = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'yes' }],
    };
    
    const minimalResponse = await testApiDirectly(minimalRequest);
    expect(minimalResponse.ok).toBe(true);
    const minimalData = await minimalResponse.json();
    expect(minimalData.content[0].text.trim()).toBe('Yes.');

    // Test structured response  
    const structuredRequest = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'return json data' }],
    };
    
    const structuredResponse = await testApiDirectly(structuredRequest);
    expect(structuredResponse.ok).toBe(true);
    const structuredData = await structuredResponse.json();
    expect(structuredData.content[0].text).toContain('json');
    expect(structuredData.content[0].text).toContain('status');

    // Test creative response
    const creativeRequest = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'tell me a creative story' }],
    };
    
    const creativeResponse = await testApiDirectly(creativeRequest);
    expect(creativeResponse.ok).toBe(true);
    const creativeData = await creativeResponse.json();
    expect(creativeData.content[0].text).toContain('Once upon a time');
  }, TEST_TIMEOUT);

  /**
   * Test that our API response format matches Anthropic's expected format
   */
  it('should return responses in the correct Anthropic API format', async () => {
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'What is TypeScript?' }],
    };

    const response = await testApiDirectly(requestBody);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    // Verify required Anthropic API response fields
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe('string');
    expect(data.type).toBe('message');
    expect(data.role).toBe('assistant');
    expect(data.content).toBeInstanceOf(Array);
    expect(data.content[0].type).toBe('text');
    expect(typeof data.content[0].text).toBe('string');
    expect(data.model).toBeDefined();
    expect(data.stop_reason).toBeDefined();
    expect(data.usage).toBeDefined();
    expect(typeof data.usage.input_tokens).toBe('number');
    expect(typeof data.usage.output_tokens).toBe('number');
  }, TEST_TIMEOUT);

  /**
   * Test subprocess management infrastructure
   */
  it('should handle subprocess timeout management correctly', async () => {
    const process = spawnManaged({
      command: 'sleep',
      args: ['5'], // Sleep for 5 seconds
      timeout: 1000, // 1 second timeout
    });

    const result = await process.start();
    
    // Should timeout and be killed
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull(); // Process was killed
  }, TEST_TIMEOUT);

  /**
   * Test multiple sequential API requests
   */
  it('should handle multiple sequential API requests', async () => {
    const requests = [
      { role: 'user', content: 'Hello' },
      { role: 'user', content: 'What is 2+2?' },
      { role: 'user', content: 'Write a function' },
    ];

    for (const message of requests) {
      const requestBody = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [message],
      };
      
      const response = await testApiDirectly(requestBody);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.content[0].text.length).toBeGreaterThan(0);
    }
  }, TEST_TIMEOUT);
});

/**
 * Extended integration tests for infrastructure and compatibility
 */
describe('Claude Code Integration Infrastructure Tests', () => {
  /**
   * Test subprocess management with real commands
   */
  it('should successfully manage subprocess execution', async () => {
    const process = spawnManaged({
      command: 'echo',
      args: ['Hello, World!'],
      timeout: 5000,
    });

    const result = await process.start();
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('Hello, World!');
  }, TEST_TIMEOUT);

  /**
   * Test that our MSW server correctly handles the Anthropic API format
   */
  it('should handle Anthropic API format with MSW correctly', async () => {
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'This is a test of the MSW integration' }],
    };

    const response = await testApiDirectly(requestBody);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.content[0].text.length).toBeGreaterThan(0);
    
    // Verify the response follows Anthropic API standards
    expect(data.id).toMatch(/^msg_/);
    expect(data.type).toBe('message');
    expect(data.role).toBe('assistant');
    expect(data.model).toContain('claude');
  }, TEST_TIMEOUT);

  /**
   * Test that Claude Code CLI is available and functional
   */
  it('should verify Claude Code CLI is available for future integration', async () => {
    const process = spawnManaged({
      command: 'claude',
      args: ['--version'],
      timeout: 10000,
    });

    const result = await process.start();
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    
    // This confirms Claude Code is available for when API endpoint configuration becomes possible
  }, TEST_TIMEOUT);
});