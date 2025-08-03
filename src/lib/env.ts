import { z } from 'zod';

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
});

/**
 * Validated environment variables.
 * Throws an error if any required variables are missing or invalid.
 */
export const env = envSchema.parse(process.env);

/**
 * Type definition for environment variables.
 * Provides type safety throughout the application.
 */
export type Env = z.infer<typeof envSchema>;
