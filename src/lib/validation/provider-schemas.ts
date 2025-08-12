import { z } from 'zod';

/**
 * Provider type enumeration for validation.
 * Must match the AIProviderType from types.ts
 */
export const providerTypeSchema = z.enum(['openai', 'anthropic', 'groq']);

/**
 * Schema for provider creation data.
 * Validates all required fields for creating a new AI provider.
 */
export const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  type: providerTypeSchema,
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url('Base URL must be a valid URL').optional().or(z.literal('')),
  models: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

/**
 * Schema for provider update data.
 * All fields optional except type validation when provided.
 */
export const updateProviderSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  type: providerTypeSchema.optional(),
  apiKey: z.string().min(1, 'API key is required').optional(),
  baseUrl: z.string().url('Base URL must be a valid URL').optional().or(z.literal('')),
  models: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for provider query parameters.
 * Validates filtering and pagination options.
 */
export const providerQuerySchema = z.object({
  type: providerTypeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  isDefault: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * Type definitions for validated schemas
 */
export type CreateProviderData = z.infer<typeof createProviderSchema>;
export type UpdateProviderData = z.infer<typeof updateProviderSchema>;
export type ProviderQueryParams = z.infer<typeof providerQuerySchema>;
