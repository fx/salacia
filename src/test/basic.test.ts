/**
 * Basic infrastructure test to verify test setup
 */

import { describe, it, expect } from 'vitest';
import { testUtils, TEST_CONFIG } from './setup';

describe('Test Infrastructure', () => {
  it('should have proper test configuration', () => {
    expect(TEST_CONFIG.api.baseUrl).toBe('http://localhost:4321');
    expect(TEST_CONFIG.anthropic.apiKey).toBe('test-api-key');
  });

  it('should generate unique test IDs', () => {
    const id1 = testUtils.generateTestId();
    const id2 = testUtils.generateTestId();

    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id1).not.toBe(id2);
  });

  it('should provide delay utility', async () => {
    const start = Date.now();
    await testUtils.delay(50);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(45); // Allow some tolerance
  });

  it('should mock and restore console', () => {
    const originalConsole = testUtils.mockConsole();

    // eslint-disable-next-line no-console
    console.log('test message');
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith('test message');

    testUtils.restoreConsole(originalConsole);
    // eslint-disable-next-line no-console
    expect(typeof console.log).toBe('function');
  });
});
