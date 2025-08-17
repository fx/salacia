// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import { execSync } from 'child_process';

/**
 * Get git short commit hash at build time
 */
function getGitShortRef() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('Could not get git shortref:', error instanceof Error ? error.message : 'Unknown error');
    return 'unknown';
  }
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [react()],
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'import.meta.env.VITE_GIT_SHORTREF': JSON.stringify(getGitShortRef()),
    },
  },
});
