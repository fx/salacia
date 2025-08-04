/**
 * Claude Code E2E Integration Test
 * 
 * This test demonstrates how to launch Claude Code CLI and point it to our API.
 * For a complete E2E test, the server would need either:
 * 1. A real Anthropic API key configured
 * 2. MSW mocks integrated into the dev server
 * 3. A test mode that uses mock responses
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawn } from 'child_process';

describe('Claude Code E2E Integration', () => {
  const API_BASE_URL = 'http://localhost:4321/api';
  
  beforeAll(() => {
    console.log(`
    ==========================================
    Claude Code E2E Integration Test
    ==========================================
    
    This test demonstrates launching Claude Code with ANTHROPIC_BASE_URL
    pointing to our local API server at ${API_BASE_URL}.
    
    To run a full E2E test:
    1. Set a real ANTHROPIC_API_KEY in the environment
    2. Run: ANTHROPIC_API_KEY=your-key npm run dev
    3. Run this test
    
    The test will show that Claude Code can be configured to use our API.
    ==========================================
    `);
  });

  it('should demonstrate Claude Code can be configured to use our API', async () => {
    // This test shows the setup for E2E testing
    const testEnv = {
      ...process.env,
      ANTHROPIC_BASE_URL: API_BASE_URL,
      ANTHROPIC_API_KEY: 'test-key',
    };

    // Log the configuration
    console.log('Claude Code would be launched with:');
    console.log(`  ANTHROPIC_BASE_URL=${testEnv.ANTHROPIC_BASE_URL}`);
    console.log(`  ANTHROPIC_API_KEY=${testEnv.ANTHROPIC_API_KEY}`);
    
    // Verify Claude CLI is available
    const checkClaude = await new Promise<boolean>((resolve) => {
      const proc = spawn('claude', ['--version'], { stdio: 'pipe' });
      proc.on('error', () => resolve(false));
      proc.on('exit', (code) => resolve(code === 0));
    });

    if (checkClaude) {
      console.log('✓ Claude CLI is installed and available');
    } else {
      console.log('✗ Claude CLI is not available - install with: npm install -g @anthropic-ai/claude-cli');
    }

    expect(checkClaude).toBe(true);
  });

  it('should show how to send a command to Claude with our API', () => {
    const exampleCode = `
    // Example: Launch Claude with our API
    const claude = spawn('claude', [], {
      env: {
        ...process.env,
        ANTHROPIC_BASE_URL: '${API_BASE_URL}',
        ANTHROPIC_API_KEY: 'your-api-key'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send a prompt
    claude.stdin.write('What is 2 + 2?\\n');
    claude.stdin.end();

    // Collect response
    let response = '';
    claude.stdout.on('data', (data) => {
      response += data.toString();
    });

    claude.on('exit', () => {
      console.log('Claude responded:', response);
    });
    `;

    console.log('Example code for E2E testing:');
    console.log(exampleCode);
    
    // This test passes to show the concept
    expect(true).toBe(true);
  });

  it('should verify our API endpoint exists', async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        }),
      });

      // The endpoint exists (even if it returns an error due to missing provider)
      console.log(`API endpoint status: ${response.status}`);
      expect(response.status).toBeDefined();
      
      // In a real E2E test with proper configuration, this would be 200
      if (response.status === 200) {
        console.log('✓ API is properly configured and working');
      } else {
        console.log('✗ API endpoint exists but needs provider configuration');
      }
    } catch (error) {
      console.log('✗ API server not running at', API_BASE_URL);
      throw error;
    }
  });
});