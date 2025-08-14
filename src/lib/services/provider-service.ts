import { AiProvider as AiProviderModel } from '../db/models/AiProvider';
import { ProviderManager } from '../ai/provider-manager';
import {
  createProviderSchema,
  updateProviderSchema,
  providerQuerySchema,
} from '../validation/provider-schemas';

/**
 * Service for managing AI providers with database persistence.
 * Extends ProviderManager to add CRUD operations for providers stored in the database.
 */
export class ProviderService {
  /**
   * Get all providers with optional filtering.
   * Validates query parameters and returns paginated results.
   */
  static async getProviders(queryParams: unknown = {}): Promise<{
    providers: AiProviderModel[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = providerQuerySchema.parse(queryParams);

    const where: Record<string, unknown> = {};

    if (params.type !== undefined) {
      where.type = params.type;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.isDefault !== undefined) {
      where.isDefault = params.isDefault;
    }

    const { count, rows } = await AiProviderModel.findAndCountAll({
      where,
      limit: params.limit,
      offset: params.offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      providers: rows,
      total: count,
      limit: params.limit,
      offset: params.offset,
    };
  }

  /**
   * Get a single provider by ID.
   * Returns null if provider not found.
   */
  static async getProvider(id: string): Promise<AiProviderModel | null> {
    return await AiProviderModel.findByPk(id);
  }

  /**
   * Create a new provider.
   * Validates input data and ensures only one default provider exists.
   */
  static async createProvider(data: unknown): Promise<AiProviderModel> {
    const validatedData = createProviderSchema.parse(data);

    // If this provider is being set as default, unset other defaults
    if (validatedData.isDefault) {
      await this.unsetDefaultProviders();
    }

    // Convert validated data to match Sequelize model expectations
    const createData = {
      name: validatedData.name,
      type: validatedData.type,
      apiKey: validatedData.apiKey,
      baseUrl: validatedData.baseUrl,
      models: validatedData.models || undefined,
      settings: (validatedData.settings || undefined) as Record<string, unknown> | undefined,
      isActive: validatedData.isActive,
      isDefault: validatedData.isDefault,
    };

    return await AiProviderModel.create(createData);
  }

  /**
   * Update an existing provider.
   * Validates input data and handles default provider logic.
   */
  static async updateProvider(id: string, data: unknown): Promise<AiProviderModel | null> {
    const validatedData = updateProviderSchema.parse(data);

    const provider = await AiProviderModel.findByPk(id);
    if (!provider) {
      return null;
    }

    // If this provider is being set as default, unset other defaults
    if (validatedData.isDefault) {
      await this.unsetDefaultProviders();
    }

    // Convert validated data to match Sequelize model expectations
    const updateData: Partial<{
      name: string;
      type: string;
      apiKey: string;
      baseUrl: string | undefined;
      models: string[] | undefined;
      settings: Record<string, unknown> | undefined;
      isActive: boolean;
      isDefault: boolean;
    }> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.apiKey !== undefined) updateData.apiKey = validatedData.apiKey;
    if (validatedData.baseUrl !== undefined) updateData.baseUrl = validatedData.baseUrl;
    if (validatedData.models !== undefined) updateData.models = validatedData.models;
    if (validatedData.settings !== undefined)
      updateData.settings = validatedData.settings as Record<string, unknown> | undefined;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault;

    await provider.update(updateData);
    return provider;
  }

  /**
   * Delete a provider by ID.
   * Throws an error when deleting default provider or when not found.
   */
  static async deleteProvider(id: string): Promise<boolean> {
    const provider = await AiProviderModel.findByPk(id);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.isDefault) {
      throw new Error('Cannot delete default provider');
    }

    await provider.destroy();
    return true;
  }

  /**
   * Test provider connectivity.
   * Uses ProviderManager to validate the provider configuration.
   */
  static async testProvider(id: string): Promise<{ success: boolean; error?: string }> {
    const provider = await AiProviderModel.findByPk(id);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    // Convert Sequelize model to plain object for ProviderManager
    const providerData = {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl || null,
      models: provider.models,
      settings: provider.settings,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };

    try {
      return await ProviderManager.testProvider(providerData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the default provider from database.
   * Falls back to ProviderManager if no database provider is marked as default.
   */
  static async getDefaultProvider(): Promise<AiProviderModel | null> {
    // First try to find a database provider marked as default
    const defaultProvider = await AiProviderModel.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (defaultProvider) {
      return defaultProvider;
    }

    // Fall back to environment-based provider from ProviderManager
    const envProvider = await ProviderManager.getDefaultProvider();
    if (!envProvider) {
      return null;
    }

    // Create a database entry for the environment provider if it doesn't exist
    const existingProvider = await AiProviderModel.findOne({
      where: { name: envProvider.name, type: envProvider.type },
    });

    if (existingProvider) {
      return existingProvider;
    }

    // Create new provider entry from environment
    const envData = {
      name: envProvider.name,
      type: envProvider.type,
      apiKey: envProvider.apiKey,
      baseUrl: envProvider.baseUrl || undefined,
      models: envProvider.models as string[] | undefined,
      settings: envProvider.settings as Record<string, unknown> | undefined,
      isActive: envProvider.isActive,
      isDefault: true,
    };
    return await AiProviderModel.create(envData);
  }

  /**
   * Set a provider as the default.
   * Unsets all other providers as default first.
   */
  static async setDefaultProvider(id: string): Promise<AiProviderModel | null> {
    const provider = await AiProviderModel.findByPk(id);
    if (!provider) {
      return null;
    }

    await this.unsetDefaultProviders();
    await provider.update({ isDefault: true });
    return provider;
  }

  /**
   * Unset all providers as default.
   * Helper method to ensure only one default provider exists.
   */
  private static async unsetDefaultProviders(): Promise<void> {
    await AiProviderModel.update({ isDefault: false }, { where: { isDefault: true } });
  }

  /**
   * Get active providers for use by ProviderManager.
   * Returns database providers with fallback to environment providers.
   */
  static async getActiveProviders(): Promise<AiProviderModel[]> {
    const dbProviders = await AiProviderModel.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    });

    // If we have database providers, return them
    if (dbProviders.length > 0) {
      return dbProviders;
    }

    // Fall back to environment providers
    const envProviders = await ProviderManager.getActiveProviders();

    // Create database entries for environment providers
    const createdProviders: AiProviderModel[] = [];
    for (const envProvider of envProviders) {
      const existing = await AiProviderModel.findOne({
        where: { name: envProvider.name, type: envProvider.type },
      });

      if (!existing) {
        const createdData = {
          name: envProvider.name,
          type: envProvider.type,
          apiKey: envProvider.apiKey,
          baseUrl: envProvider.baseUrl || undefined,
          models: envProvider.models as string[] | undefined,
          settings: envProvider.settings as Record<string, unknown> | undefined,
          isActive: envProvider.isActive,
          isDefault: envProvider.isDefault,
        };
        const created = await AiProviderModel.create(createdData);
        createdProviders.push(created);
      } else {
        createdProviders.push(existing);
      }
    }

    return createdProviders;
  }
}
