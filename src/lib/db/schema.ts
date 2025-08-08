/**
 * Temporary stub schema exports to maintain compatibility
 * during Drizzle to Sequelize migration.
 * 
 * This will be fully removed in a future phase once AI service
 * is refactored to use Sequelize models.
 */

// Temporary type stubs - AI service will be refactored in later phase
export type AiProvider = {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  baseUrl: string | null;
  models: unknown;
  settings: unknown;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AiInteraction = {
  id: string;
  providerId: string | null;
  model: string;
  request: unknown;
  response: unknown;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  responseTimeMs: number | null;
  statusCode: number | null;
  error: string | null;
  createdAt: Date;
};

// Stub objects to prevent build errors - these won't be used functionally
export const aiProviders = {
  id: null,
  name: null,
  type: null,
  isActive: null,
  isDefault: null
};

export const aiInteractions = {
  id: null,
  providerId: null,
  model: null,
  request: null,
  response: null,
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  responseTimeMs: null,
  statusCode: null,
  error: null,
  createdAt: null
};

// Stub Drizzle functions
export function eq() { throw new Error('Drizzle functions are not available - use Sequelize instead'); }
export function and() { throw new Error('Drizzle functions are not available - use Sequelize instead'); }
export function sql() { throw new Error('Drizzle functions are not available - use Sequelize instead'); }