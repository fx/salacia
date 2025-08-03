/**
 * AI Provider Database Service
 * 
 * Handles database operations for AI provider configurations.
 * Provides CRUD operations and provider management functionality.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { aiProviders, type AiProvider, type NewAiProvider } from '../db/schema.js';
import { 
  ProviderConfigSchema, 
  type ProviderConfig, 
  type ProviderType,
  ProviderConfigurationError 
} from './providers.js';

/**
 * Service class for managing AI provider configurations in the database
 */
export class ProviderService {
  /**
   * Creates a new AI provider configuration
   * 
   * @param config Provider configuration data
   * @returns Created provider record
   */
  async createProvider(config: ProviderConfig): Promise<AiProvider> {
    // Validate configuration
    const validatedConfig = ProviderConfigSchema.parse(config);

    // Check if provider with this name already exists
    const existingProvider = await this.getProviderByName(validatedConfig.name);
    if (existingProvider) {
      throw new ProviderConfigurationError(
        `Provider with name '${validatedConfig.name}' already exists`
      );
    }

    const newProvider: NewAiProvider = {
      name: validatedConfig.name,
      type: validatedConfig.type,
      baseUrl: validatedConfig.baseUrl,
      apiKey: validatedConfig.apiKey,
      isActive: validatedConfig.isActive,
      configuration: validatedConfig.configuration,
    };

    const [createdProvider] = await db
      .insert(aiProviders)
      .values(newProvider)
      .returning();

    return createdProvider;
  }

  /**
   * Retrieves all active AI providers
   * 
   * @returns Array of active provider configurations
   */
  async getActiveProviders(): Promise<AiProvider[]> {
    return await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.isActive, true));
  }

  /**
   * Retrieves all AI providers (active and inactive)
   * 
   * @returns Array of all provider configurations
   */
  async getAllProviders(): Promise<AiProvider[]> {
    return await db.select().from(aiProviders);
  }

  /**
   * Retrieves a provider by its ID
   * 
   * @param id Provider ID
   * @returns Provider configuration or null if not found
   */
  async getProviderById(id: string): Promise<AiProvider | null> {
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.id, id))
      .limit(1);

    return provider || null;
  }

  /**
   * Retrieves a provider by its name
   * 
   * @param name Provider name
   * @returns Provider configuration or null if not found
   */
  async getProviderByName(name: string): Promise<AiProvider | null> {
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.name, name))
      .limit(1);

    return provider || null;
  }

  /**
   * Retrieves providers by type
   * 
   * @param type Provider type
   * @param activeOnly Whether to return only active providers
   * @returns Array of provider configurations
   */
  async getProvidersByType(
    type: ProviderType, 
    activeOnly: boolean = true
  ): Promise<AiProvider[]> {
    const conditions = [eq(aiProviders.type, type)];
    if (activeOnly) {
      conditions.push(eq(aiProviders.isActive, true));
    }

    return await db
      .select()
      .from(aiProviders)
      .where(and(...conditions));
  }

  /**
   * Updates an existing provider configuration
   * 
   * @param id Provider ID
   * @param updates Partial provider configuration updates
   * @returns Updated provider configuration or null if not found
   */
  async updateProvider(
    id: string, 
    updates: Partial<Omit<ProviderConfig, 'name'>>
  ): Promise<AiProvider | null> {
    // Validate updates if provided
    if (Object.keys(updates).length > 0) {
      const partialSchema = ProviderConfigSchema.partial().omit({ name: true });
      partialSchema.parse(updates);
    }

    const [updatedProvider] = await db
      .update(aiProviders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aiProviders.id, id))
      .returning();

    return updatedProvider || null;
  }

  /**
   * Deactivates a provider (soft delete)
   * 
   * @param id Provider ID
   * @returns True if provider was deactivated, false if not found
   */
  async deactivateProvider(id: string): Promise<boolean> {
    const result = await db
      .update(aiProviders)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(aiProviders.id, id));

    return result.rowCount > 0;
  }

  /**
   * Permanently deletes a provider configuration
   * 
   * @param id Provider ID
   * @returns True if provider was deleted, false if not found
   */
  async deleteProvider(id: string): Promise<boolean> {
    const result = await db
      .delete(aiProviders)
      .where(eq(aiProviders.id, id));

    return result.rowCount > 0;
  }

  /**
   * Gets the first active provider of a specific type
   * This is useful for simple routing scenarios
   * 
   * @param type Provider type
   * @returns First active provider of the specified type or null
   */
  async getDefaultProviderForType(type: ProviderType): Promise<AiProvider | null> {
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(and(
        eq(aiProviders.type, type),
        eq(aiProviders.isActive, true)
      ))
      .limit(1);

    return provider || null;
  }
}