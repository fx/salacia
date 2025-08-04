# Claude Code E2E Integration Test Suite

This directory contains E2E integration tests for verifying Claude Code CLI works with our API, implementing the core requirements from issue #7.

## Overview

The test suite implements proper end-to-end integration tests by actually launching the Claude Code CLI and testing it against our API running at localhost:4321.

Key features:
1. **Real CLI Testing**: Launches actual Claude Code CLI processes with ANTHROPIC_BASE_URL
2. **E2E Validation**: Tests complete request/response cycles through Claude CLI
3. **Scenario Coverage**: Tests various use cases like simple questions, code generation, and creative content
4. **API Compatibility**: Verifies our API works correctly with Claude Code

## Architecture

### Core Components

#### 1. E2E Integration Tests (`claude-code-integration.test.ts`)
- Launches Claude Code CLI with `ANTHROPIC_BASE_URL=http://localhost:4321`
- Tests various scenarios: simple questions, code generation, creative content
- Validates that Claude CLI can successfully communicate with our API
- Verifies response handling and error scenarios

#### 2. Request Helpers (`utils/request-helpers.ts`)
- Utilities for creating test requests and validating responses
- Pre-built message templates and request configurations
- Helper functions for API testing and response validation

#### 3. MSW Handlers (`mocks/handlers.ts`)
- Mock handlers that simulate realistic API responses
- Support for streaming and non-streaming responses
- Error scenario handlers for comprehensive testing

### Test Categories

#### 1. Basic Integration Tests
- **Simple Questions**: "What is 2 + 2?"
- **Code Generation**: "Write a TypeScript function"
- **Yes/No Questions**: Simple factual questions
- **Creative Content**: Poems, stories, explanations

#### 2. Sequential Testing
- **Multiple Questions**: Testing CLI across multiple interactions
- **API Compatibility**: Verifying our API format works with Claude CLI

#### 3. Error Handling
- **Timeout Scenarios**: Testing CLI timeout behavior
- **API Compatibility**: Ensuring our responses match Claude's expectations

## Prerequisites

Before running these tests, ensure:

1. **API Server Running**: Start the dev server at localhost:4321
   ```bash
   npm run dev
   ```

2. **Claude Code CLI Installed**: Install Claude CLI
   - Visit https://claude.ai/docs/cli for installation instructions
   - Verify with: `claude --version`

## Usage

### Running Tests

```bash
# Run all E2E integration tests
npm test claude-code-integration.test.ts

# Run with verbose output
npm test claude-code-integration.test.ts -- --reporter=verbose

# Run specific test suite
npm test -- --grep "Claude Code E2E Integration Tests"
```

### Test Structure

Each test follows this pattern:

```typescript
it('should handle basic questions through Claude CLI', async () => {
  // Act: Run Claude CLI with our API
  const result = await runClaudeCommand('What is 2 + 2?');
  
  // Assert: Verify Claude CLI succeeded and got expected response
  expect(result.timedOut).toBe(false);
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toLowerCase()).toContain('4');
});
```

## How It Works

The E2E tests work by:

1. **Setting Environment Variables**: Configure Claude CLI to use our API
   ```typescript
   env: {
     ...process.env,
     ANTHROPIC_BASE_URL: 'http://localhost:4321',
     ANTHROPIC_API_KEY: 'test-api-key',
   }
   ```

2. **Spawning Claude CLI**: Launch actual Claude processes
   ```typescript
   const process = spawn('claude', [prompt], { env, stdio: ['pipe', 'pipe', 'pipe'] });
   ```

3. **Capturing Output**: Collect stdout/stderr and validate responses
4. **Timeout Management**: Ensure tests don't hang on problematic scenarios

## Test Coverage

The test suite covers:

- ✅ **Basic Questions**: Simple factual queries
- ✅ **Code Generation**: TypeScript function creation
- ✅ **Creative Content**: Poems and explanations
- ✅ **Sequential Testing**: Multiple questions in sequence
- ✅ **API Compatibility**: Verifying our API format works with Claude CLI
- ✅ **Error Handling**: Timeout and error scenarios
- ✅ **Prerequisites**: API server and CLI availability checks

## Development

### Adding New Tests

1. **New Test Cases**: Add to the main describe blocks in `claude-code-integration.test.ts`
2. **New Scenarios**: Create new test cases that call `runClaudeCommand(prompt)`
3. **Error Cases**: Test edge cases and error scenarios

Example:
```typescript
it('should handle new scenario', async () => {
  const result = await runClaudeCommand('Your test prompt here');
  
  expect(result.timedOut).toBe(false);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('expected content');
});
```

### Debugging

- **Check API Server**: Ensure `npm run dev` is running at localhost:4321
- **Verify CLI**: Test `claude --version` works
- **Environment Variables**: Ensure ANTHROPIC_BASE_URL is set correctly
- **Timeout Issues**: Increase timeout values if needed
- **Response Validation**: Check stdout/stderr content for debugging

### Best Practices

1. **Clear Prompts**: Use specific, testable prompts
2. **Flexible Assertions**: Use `.toContain()` for response validation
3. **Proper Cleanup**: Tests automatically clean up processes
4. **Appropriate Timeouts**: Use reasonable timeouts (30s for CLI commands)
5. **Error Handling**: Test both success and failure scenarios

## Benefits of E2E Testing

This approach provides:

1. **Real Integration**: Tests actual Claude CLI with our API
2. **Comprehensive Coverage**: Tests complete request/response cycles
3. **Regression Detection**: Catches API compatibility issues
4. **Confidence**: Proves the integration actually works
5. **Simplicity**: Straightforward test setup and execution

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use descriptive test names that explain the scenario
3. Add appropriate assertions for the expected behavior
4. Consider both positive and negative test cases
5. Ensure tests are deterministic and reliable

This E2E test suite provides confidence that Claude Code CLI works correctly with our API implementation.