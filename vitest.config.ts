import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the Salacia application.
 * 
 * Configures the test environment for running unit tests, integration tests, and API tests
 * with TypeScript support, coverage reporting, and happy-dom environment for DOM simulation.
 * 
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    /**
     * Use happy-dom environment for DOM simulation without a full browser
     */
    environment: 'happy-dom',
    
    /**
     * Test file patterns - includes any .test.ts or .spec.ts files
     */
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    /**
     * Exclude patterns to avoid testing node_modules, dist, and other build artifacts
     */
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ],
    
    /**
     * Global setup and teardown files
     */
    setupFiles: ['./src/test/setup.ts'],
    
    /**
     * Coverage configuration for code coverage reporting
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/[.]**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        '**/virtual:*',
        '**/__x00__*',
        '**/\x00*',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/coverage/**'
      ]
    }
  }
});