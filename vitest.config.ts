import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for Salacia testing suite
 * 
 * Configures the test environment with:
 * - Happy DOM for web API simulation
 * - TypeScript support
 * - Test file patterns
 * - Coverage configuration
 */
export default defineConfig({
  test: {
    // Use happy-dom for web API simulation in tests
    environment: 'happy-dom',
    
    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    
    // Global test setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/migrations/**'
      ]
    },
    
    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Setup files
    setupFiles: ['src/test/setup.ts']
  },
  
  // Resolve configuration for imports
  resolve: {
    alias: {
      '@': '/src',
      '@test': '/src/test'
    }
  }
});