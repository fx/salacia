import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  jsonb,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * System metadata table for tracking application information and settings.
 * Stores key-value pairs for application configuration and runtime data.
 */
export const systemMetadata = pgTable('system_metadata', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * API requests table for logging all incoming API requests.
 * Tracks request metadata, timing, and responses for monitoring and debugging.
 */
export const apiRequests = pgTable('api_requests', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  headers: jsonb('headers'),
  query: jsonb('query'),
  body: jsonb('body'),
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  statusCode: integer('status_code'),
  responseTime: integer('response_time_ms'),
  responseSize: integer('response_size_bytes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Health check logs table for tracking system health status.
 * Records health check results and system status over time.
 */
export const healthChecks = pgTable('health_checks', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  status: varchar('status', { length: 20 }).notNull(), // 'healthy', 'degraded', 'unhealthy'
  databaseStatus: boolean('database_status').notNull(),
  responseTime: integer('response_time_ms').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * AI provider configurations table for managing LLM provider settings.
 * Stores configuration for different AI providers like OpenAI, Anthropic, etc.
 */
export const aiProviders = pgTable('ai_providers', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(), // 'openai', 'anthropic', 'groq', etc.
  apiKey: text('api_key').notNull(),
  baseUrl: varchar('base_url', { length: 500 }),
  models: jsonb('models'), // Available models for this provider
  settings: jsonb('settings'), // Provider-specific settings
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * API interactions table for logging AI API requests and responses.
 * Tracks all interactions with AI providers for monitoring and debugging.
 */
export const aiInteractions = pgTable('ai_interactions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  providerId: uuid('provider_id').references(() => aiProviders.id),
  model: varchar('model', { length: 100 }).notNull(),
  request: jsonb('request').notNull(),
  response: jsonb('response'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  responseTimeMs: integer('response_time_ms'),
  statusCode: integer('status_code'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Type definitions for database tables.
 * Provides type safety for database operations.
 */
export type SystemMetadata = typeof systemMetadata.$inferSelect;
export type NewSystemMetadata = typeof systemMetadata.$inferInsert;

export type ApiRequest = typeof apiRequests.$inferSelect;
export type NewApiRequest = typeof apiRequests.$inferInsert;

export type HealthCheck = typeof healthChecks.$inferSelect;
export type NewHealthCheck = typeof healthChecks.$inferInsert;

export type AiProvider = typeof aiProviders.$inferSelect;
export type NewAiProvider = typeof aiProviders.$inferInsert;

export type AiInteraction = typeof aiInteractions.$inferSelect;
export type NewAiInteraction = typeof aiInteractions.$inferInsert;
