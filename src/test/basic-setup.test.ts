import { describe, it, expect } from 'vitest';

/**
 * Basic setup verification tests.
 * 
 * These tests verify that the fundamental testing infrastructure is working
 * correctly, including Vitest configuration, MSW server setup, and TypeScript
 * compilation in the test environment.
 */
describe('Basic Test Setup', () => {
  /**
   * Verify that Vitest is properly configured and can run basic tests
   */
  it('should run basic tests', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  /**
   * Verify that TypeScript is working properly in test files
   */
  it('should support TypeScript features', () => {
    interface TestInterface {
      value: number;
    }
    
    const testObj: TestInterface = { value: 42 };
    expect(testObj.value).toBe(42);
  });

  /**
   * Verify that MSW server is accessible via global test utils
   */
  it('should have access to mock server via global utils', () => {
    expect(globalThis.TestUtils).toBeDefined();
    expect(globalThis.TestUtils.mockServer).toBeDefined();
  });

  /**
   * Verify that fetch is available in the test environment
   */
  it('should have fetch available for HTTP testing', () => {
    expect(typeof fetch).toBe('function');
  });
});