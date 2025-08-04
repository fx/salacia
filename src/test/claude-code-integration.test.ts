/**
 * Claude Code E2E Integration Tests
 *
 * This test suite implements proper end-to-end integration tests by actually
 * launching the Claude Code CLI and testing it against our API running at
 * localhost:4321. This addresses the core requirement from issue #7.
 *
 * The tests use ANTHROPIC_BASE_URL environment variable to point Claude Code
 * to our local API instead of the production Anthropic API.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { promisify } from 'util';

/**
 * Test configuration
 */
const TEST_TIMEOUT = 60000; // 60 seconds for E2E tests
const CLAUDE_TIMEOUT = 30000; // 30 seconds for Claude CLI commands
const API_BASE_URL = 'http://localhost:4321';

/**
 * Interface for subprocess execution result
 */
interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Execute Claude Code CLI command with our API
 */
async function runClaudeCommand(prompt: string, timeout: number = CLAUDE_TIMEOUT): Promise<ExecResult> {
  return new Promise((resolve) => {
    const process = spawn('claude', [prompt], {
      env: {
        ...process.env,
        ANTHROPIC_BASE_URL: API_BASE_URL,
        ANTHROPIC_API_KEY: 'test-api-key', // Mock API key for testing
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      process.kill('SIGKILL');
    }, timeout);

    // Collect output
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (process.stderr) {
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    // Handle process exit
    process.on('exit', (code) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
        timedOut,
      });
    });

    // Handle process errors
    process.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + error.message,
        timedOut,
      });
    });
  });
}

/**
 * Check if our API server is running
 */
async function checkApiServer(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if Claude Code CLI is available
 */
async function checkClaudeAvailability(): Promise<boolean> {
  try {
    const result = await runClaudeCommand('--version', 10000);
    return result.exitCode === 0 && result.stdout.includes('.');
  } catch {
    return false;
  }
}

describe('Claude Code E2E Integration Tests', () => {
  beforeAll(async () => {
    // Verify prerequisites
    const apiRunning = await checkApiServer();
    if (!apiRunning) {
      throw new Error(
        `API server is not running at ${API_BASE_URL}. ` +
        'Please start the dev server with "npm run dev" before running these tests.'
      );
    }

    const claudeAvailable = await checkClaudeAvailability();
    if (!claudeAvailable) {
      throw new Error(
        'Claude Code CLI is not available. Please install it before running these tests. ' +
        'Visit https://claude.ai/docs/cli for installation instructions.'
      );
    }

    console.log('Prerequisites verified: API server running and Claude CLI available');
  }, TEST_TIMEOUT);

  /**
   * Test basic question and response
   */
  it('should handle basic questions through Claude CLI', async () => {
    const result = await runClaudeCommand('What is 2 + 2?');
    
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout.toLowerCase()).toContain('4');
  }, TEST_TIMEOUT);

  /**
   * Test code generation request
   */
  it('should handle code generation requests through Claude CLI', async () => {
    const result = await runClaudeCommand('Write a simple TypeScript function that adds two numbers');
    
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout.toLowerCase()).toContain('function');
    expect(result.stdout.toLowerCase()).toContain('typescript');
  }, TEST_TIMEOUT);

  /**
   * Test simple yes/no question
   */
  it('should handle simple yes/no questions through Claude CLI', async () => {
    const result = await runClaudeCommand('Is TypeScript a programming language? Answer with just yes or no.');
    
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout.toLowerCase()).toContain('yes');
  }, TEST_TIMEOUT);

  /**
   * Test multiple questions in sequence
   */
  it('should handle multiple sequential questions through Claude CLI', async () => {
    const questions = [
      'What is the capital of France?',
      'What is 10 * 10?',
      'Name one programming language',
    ];

    for (const question of questions) {
      const result = await runClaudeCommand(question);
      
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout.length).toBeGreaterThan(0);
    }
  }, TEST_TIMEOUT);

  /**
   * Test creative content generation
   */
  it('should handle creative content requests through Claude CLI', async () => {
    const result = await runClaudeCommand('Write a short poem about coding');
    
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout.toLowerCase()).toContain('cod');
  }, TEST_TIMEOUT);

  /**
   * Test explanation request
   */
  it('should handle explanation requests through Claude CLI', async () => {
    const result = await runClaudeCommand('Explain what REST API means in one sentence');
    
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout.toLowerCase()).toContain('api');
  }, TEST_TIMEOUT);
});

describe('Claude Code Integration Error Handling', () => {
  /**
   * Test that Claude CLI handles API responses correctly
   */
  it('should work with our API implementation', async () => {
    // This test verifies that our API is compatible with Claude Code's expectations
    const result = await runClaudeCommand('Hello Claude, are you working with our API?');
    
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    
    // If Claude CLI can complete the request successfully, our API is compatible
    expect(result.stdout.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  /**
   * Test timeout handling
   */
  it('should handle timeout scenarios gracefully', async () => {
    // Use a very short timeout to test timeout handling
    const result = await runClaudeCommand('Tell me a very long story', 100);
    
    expect(result.timedOut).toBe(true);
  }, TEST_TIMEOUT);
});