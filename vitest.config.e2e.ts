/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // @ts-expect-error: vitest defineConfig overload issue
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.e2e.test.{ts,tsx}', '**/claude-code-e2e.test.{ts,tsx}'],
  },
});
