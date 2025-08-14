import { z } from 'zod';
import { loadEnv } from 'vite';

const viteEnv = loadEnv('development', process.cwd(), '');

/**
 * Environment variables schema definition.
 * Validates and transforms environment variables with strict typing.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().int().positive().default(4321),
  HOST: z.string().default('localhost'),

  // AI Provider API Keys (optional - can be configured per-provider in database)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),

  // AI Provider Configuration
  DEFAULT_AI_PROVIDER: z.enum(['openai', 'anthropic', 'groq']).optional(),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  AI_STREAMING_ENABLED: z.coerce.boolean().default(true),

  // Claude Max OAuth Configuration
  CLAUDE_MAX_CLIENT_ID: z.string().optional(),
  CLAUDE_MAX_CLIENT_SECRET: z.string().optional(),
  CLAUDE_MAX_REDIRECT_URI: z.string().url().optional(),

  // Application URL (for OAuth redirect)
  PUBLIC_APP_URL: z.string().url().default('http://localhost:4321'),
});

/**
 * Validated environment variables.
 * Throws an error if any required variables are missing or invalid.
 */
export const env = envSchema.parse({ ...process.env, ...viteEnv });

/**
 * Type definition for environment variables.
 * Provides type safety throughout the application.
 */
export type Env = z.infer<typeof envSchema>;
