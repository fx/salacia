import { z } from 'zod';

/**
 * Provider type enumeration for validation.
 * Must match the AIProviderType from types.ts
 */
export const providerTypeSchema = z.enum(['openai', 'anthropic', 'groq']);

/**
 * Authentication type enumeration for validation.
 * Must match the AuthType from types.ts
 */
export const authTypeSchema = z.enum(['api_key', 'oauth']);

/**
 * Base URL schema - allows valid URL or empty string, normalized to undefined
 */
const baseUrlSchema = z
  .string()
  .url()
  .optional()
  .or(z.literal(''))
  .transform(val => (val === '' ? undefined : val));

/**
 * Schema for provider creation data.
 * Validates all required fields for creating a new AI provider.
 * Supports both API key and OAuth authentication methods.
 */
export const createProviderSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    type: providerTypeSchema,
    authType: authTypeSchema.default('api_key'),
    apiKey: z.string().optional(),
    baseUrl: baseUrlSchema,
    models: z.array(z.string()).optional(),
    settings: z.record(z.unknown()).optional(),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false),
    // OAuth-specific fields
    oauthClientId: z.string().optional(),
    oauthScopes: z.array(z.string()).optional(),
  })
  .refine(
    data => {
      // For API key providers, API key is required
      if (data.authType === 'api_key') {
        return data.apiKey && data.apiKey.length > 0;
      }
      // For OAuth providers, client ID is required
      if (data.authType === 'oauth') {
        return data.oauthClientId && data.oauthClientId.length > 0;
      }
      return true;
    },
    {
      message:
        'API key is required for api_key providers, OAuth client ID is required for oauth providers',
      path: ['apiKey'],
    }
  );

/**
 * Schema for provider update data.
 * All fields optional except type validation when provided.
 * Supports both API key and OAuth authentication methods.
 */
export const updateProviderSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  type: providerTypeSchema.optional(),
  authType: authTypeSchema.optional(),
  apiKey: z.string().optional(),
  baseUrl: baseUrlSchema.optional(),
  models: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  // OAuth-specific fields
  oauthClientId: z.string().optional(),
  oauthScopes: z.array(z.string()).optional(),
});

/**
 * Schema for provider query parameters.
 * Validates filtering and pagination options.
 */
export const providerQuerySchema = z.object({
  type: providerTypeSchema.optional(),
  authType: authTypeSchema.optional(),
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
