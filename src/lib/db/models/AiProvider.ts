import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../sequelize-connection';

/**
 * Sequelize model for the ai_providers table.
 * Stores configuration for different AI providers like OpenAI, Anthropic, etc.
 *
 * This model provides an ORM interface for managing AI provider configurations,
 * including API credentials, endpoints, available models, and provider settings.
 *
 * @example
 * ```typescript
 * // Create new AI provider
 * const provider = await AiProvider.create({
 *   name: 'OpenAI GPT',
 *   type: 'openai',
 *   apiKey: 'sk-...',
 *   baseUrl: 'https://api.openai.com/v1',
 *   models: ['gpt-4', 'gpt-3.5-turbo'],
 *   isActive: true,
 *   isDefault: false
 * });
 *
 * // Find active providers
 * const activeProviders = await AiProvider.findAll({
 *   where: { isActive: true }
 * });
 * ```
 */
export class AiProvider extends Model<
  InferAttributes<AiProvider>,
  InferCreationAttributes<AiProvider>
> {
  /**
   * Primary key UUID for the AI provider record.
   * Generated automatically using PostgreSQL's gen_random_uuid() function.
   */
  declare id: string;

  /**
   * Unique display name for the AI provider.
   * Used for identification in UI and logs.
   * Maximum length: 100 characters.
   */
  declare name: string;

  /**
   * Provider type identifier.
   * Examples: 'openai', 'anthropic', 'groq', 'azure', etc.
   * Maximum length: 50 characters.
   */
  declare type: string;

  /**
   * API key for authenticating with the provider.
   * Stored as encrypted text for security.
   */
  declare apiKey: string;

  /**
   * Base URL for the provider's API endpoint.
   * Optional - uses provider default if not specified.
   * Maximum length: 500 characters.
   */
  declare baseUrl?: string;

  /**
   * Available models for this provider.
   * Stored as JSON array for flexible model management.
   * Examples: ['gpt-4', 'gpt-3.5-turbo'] or ['claude-3-opus', 'claude-3-sonnet']
   */
  declare models?: Record<string, unknown>;

  /**
   * Provider-specific configuration settings.
   * Stored as JSON for flexible provider customization.
   * May include timeout settings, retry policies, etc.
   */
  declare settings?: Record<string, unknown>;

  /**
   * Whether the provider is currently active and available for use.
   * Inactive providers are ignored during provider selection.
   */
  declare isActive: boolean;

  /**
   * Whether this provider is the default choice for new requests.
   * Only one provider should be marked as default at a time.
   */
  declare isDefault: boolean;

  /**
   * Timestamp indicating when the provider was created.
   * Set automatically on record creation.
   */
  declare createdAt: Date;

  /**
   * Timestamp indicating when the provider was last updated.
   * Updated automatically whenever the record is modified.
   */
  declare updatedAt: Date;
}

/**
 * Initialize the AiProvider model with table schema definition.
 * Defines the structure, constraints, and database mapping for the model.
 */
AiProvider.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key UUID for the AI provider record',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Unique display name for the AI provider',
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Provider type identifier (openai, anthropic, groq, etc.)',
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'api_key',
      comment: 'API key for authenticating with the provider',
    },
    baseUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'base_url',
      comment: "Base URL for the provider's API endpoint",
    },
    models: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Available models for this provider',
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Provider-specific configuration settings',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Whether the provider is currently active and available',
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
      comment: 'Whether this provider is the default choice',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp when the provider was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Timestamp when the provider was last updated',
    },
  },
  {
    sequelize,
    tableName: 'ai_providers',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name'],
        name: 'ai_providers_name_unique',
      },
      {
        fields: ['type'],
        name: 'ai_providers_type_idx',
      },
      {
        fields: ['is_active'],
        name: 'ai_providers_is_active_idx',
      },
      {
        fields: ['is_default'],
        name: 'ai_providers_is_default_idx',
      },
    ],
    comment: 'AI provider configurations table for managing LLM provider settings',
  }
);
