# Claude Code Integration Test Suite

This directory contains a comprehensive test suite for verifying Claude Code integration with our API, implementing the core requirements from issue #7.

## Overview

The test suite addresses the key requirement to test Claude Code end-to-end integration with our API by:

1. **API Compatibility Testing**: Validates that our API implementation matches Claude Code's expected request/response format
2. **Subprocess Management**: Provides infrastructure for managing Claude Code CLI processes in tests
3. **MSW Integration**: Uses Mock Service Worker to simulate Anthropic API responses
4. **Infrastructure Validation**: Confirms all components work together correctly

## Architecture

### Core Components

#### 1. Test Server (`utils/test-server.ts`)
- HTTP server that serves our API endpoints with MSW mocks
- Handles CORS, request forwarding, and streaming responses
- Maps local API paths to Anthropic API format for MSW compatibility
- Provides server lifecycle management for tests

#### 2. Subprocess Manager (`utils/subprocess-manager.ts`)
- Manages child process spawning with proper timeout and cleanup
- Provides process registry for automatic cleanup after tests
- Handles stdout/stderr capture and streaming
- Supports interactive and non-interactive process modes

#### 3. MSW Handlers (`mocks/handlers.ts`)
- Intelligent request handlers that analyze content and return appropriate responses
- Support for streaming and non-streaming responses
- Error scenario handlers (auth, rate limit, server errors)
- Dynamic response generation based on request characteristics

### Test Categories

#### 1. API Compatibility Tests
- **Basic Requests**: Validates non-streaming request/response cycle
- **Code Generation**: Tests code-specific response handling
- **Streaming Responses**: Verifies Server-Sent Events format
- **Error Handling**: Tests various error scenarios (401, 429, 500)
- **Response Format**: Validates Anthropic API schema compliance

#### 2. Infrastructure Tests
- **Subprocess Management**: Tests process timeout and cleanup
- **Server Lifecycle**: Validates test server startup/shutdown
- **Claude Code Availability**: Confirms CLI is installed and functional

## Usage

### Running Tests

```bash
# Run all integration tests
npm run test claude-code-integration.test.ts

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:run claude-code-integration.test.ts
```

### Test Structure

Each test follows this pattern:

```typescript
it('should test something', async () => {
  // Arrange: Set up request body or subprocess config
  const requestBody = {
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'test prompt' }],
  };

  // Act: Make API request or spawn process
  const response = await testApiDirectly(requestBody);

  // Assert: Verify response format and content
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(data.content[0].text).toBeDefined();
});
```

## Current Limitations and Future Work

### Claude Code API Endpoint Configuration

**Current Status**: Claude Code CLI is hardcoded to use `api.anthropic.com` and doesn't currently support configurable API endpoints through environment variables or configuration files.

**Investigated Approaches**:
- Environment variables (`ANTHROPIC_API_BASE_URL`, `ANTHROPIC_API_URL`) - Not supported
- Configuration files - No documented mechanism
- Runtime patching - Complex and brittle

**Future Integration**:
When Claude Code supports configurable API endpoints, the existing infrastructure can be extended to:

1. **Direct CLI Testing**:
```typescript
// Example of future direct CLI testing
const result = await runClaudeCode('Hello', {
  apiBaseUrl: testServer.apiBaseUrl,
  timeout: 15000,
});
expect(result.exitCode).toBe(0);
expect(result.stdout).toContain('response');
```

2. **End-to-End Workflows**:
   - Test complete request/response cycles through Claude Code
   - Validate streaming response handling in CLI
   - Test error propagation and handling
   - Verify authentication and rate limiting behavior

### Workarounds and Alternatives

For now, the test suite validates:

1. **API Compatibility**: Our API responds with the exact format Claude Code expects
2. **Request Handling**: All request types and parameters are processed correctly
3. **Error Scenarios**: Error responses match Anthropic's format
4. **Infrastructure**: Subprocess management works for when CLI integration is possible

### Network-Level Interception

Future approaches for testing could include:
- HTTP proxy servers with SSL certificate management
- Network namespace isolation
- Container-based testing with custom DNS resolution
- System-level request interception

## Test Coverage

The test suite covers:

- ✅ **API Format Compatibility**: Request/response format validation
- ✅ **Streaming Responses**: Server-Sent Events format
- ✅ **Error Handling**: All major error scenarios
- ✅ **Subprocess Management**: Process lifecycle and cleanup
- ✅ **Server Infrastructure**: Test server functionality
- ✅ **MSW Integration**: Mock service worker handlers
- ⏳ **Direct CLI Integration**: Pending API endpoint configuration support

## Development

### Adding New Tests

1. **API Tests**: Add new test cases to the main describe block
2. **Infrastructure Tests**: Add to the "Infrastructure Tests" describe block
3. **New Handlers**: Create custom MSW handlers in `mocks/handlers.ts`
4. **Subprocess Tests**: Use the subprocess management utilities

### Debugging

- Enable debug logs: Set `DEBUG=1` environment variable
- Check server console output during test runs
- Use `console.log` in test server for request inspection
- Verify MSW handler matching with request logging

## Contributing

When adding new test scenarios:

1. Follow the existing test structure and naming conventions
2. Add proper cleanup for any resources (servers, processes)
3. Use appropriate timeouts for different test types
4. Document any new infrastructure components
5. Ensure tests are deterministic and don't depend on external services

This test suite provides a solid foundation for Claude Code integration testing and can be extended as the CLI evolves to support configurable API endpoints.