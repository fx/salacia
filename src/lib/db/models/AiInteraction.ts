import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../sequelize-connection';
import { broker } from '../../realtime/broker';

/**
 * Sequelize model for the ai_interactions table.
 * Tracks all interactions with AI providers for monitoring and debugging.
 *
 * This model provides an ORM interface for managing AI API requests and responses,
 * including token usage, response times, and error handling. It includes hooks
 * to automatically track when message data is updated.
 *
 * @example
 * ```typescript
 * // Create new AI interaction
 * const interaction = await AiInteraction.create({
 *   providerId: 'some-provider-id',
 *   model: 'gpt-4',
 *   request: { messages: [{ role: 'user', content: 'Hello' }] },
 *   response: { content: 'Hi there!' },
 *   promptTokens: 10,
 *   completionTokens: 5,
 *   totalTokens: 15,
 *   responseTimeMs: 1200,
 *   statusCode: 200
 * });
 *
 * // Update interaction (triggers message tracking hooks)
 * await interaction.update({
 *   response: { content: 'Updated response' },
 *   completionTokens: 8,
 *   totalTokens: 18
 * });
 * ```
 */
export class AiInteraction extends Model<
  InferAttributes<AiInteraction>,
  InferCreationAttributes<AiInteraction>
> {
  /**
   * Primary key UUID for the AI interaction record.
   * Generated automatically using PostgreSQL's gen_random_uuid() function.
   */
  declare id: string;

  /**
   * Foreign key reference to the AI provider used for this interaction.
   * Links to the ai_providers table to track which provider handled the request.
   */
  declare providerId?: string;

  /**
   * Model name used for the AI interaction.
   * Examples: 'gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', etc.
   * Maximum length: 100 characters.
   */
  declare model: string;

  /**
   * Complete request payload sent to the AI provider.
   * Stored as JSON to accommodate different provider request formats.
   * Typically includes messages, system prompts, and generation parameters.
   */
  declare request: Record<string, unknown>;

  /**
   * Complete response received from the AI provider.
   * Stored as JSON to accommodate different provider response formats.
   * May be null if the request failed or is still in progress.
   */
  declare response?: Record<string, unknown>;

  /**
   * Number of tokens used in the input prompt.
   * Used for tracking API usage and costs.
   */
  declare promptTokens?: number;

  /**
   * Number of tokens generated in the completion.
   * Used for tracking API usage and costs.
   */
  declare completionTokens?: number;

  /**
   * Total tokens consumed (prompt + completion).
   * Usually equals promptTokens + completionTokens.
   */
  declare totalTokens?: number;

  /**
   * Response time in milliseconds for the API request.
   * Tracks performance and helps identify slow requests.
   */
  declare responseTimeMs?: number;

  /**
   * HTTP status code returned by the API request.
   * Examples: 200 (success), 400 (bad request), 500 (server error).
   */
  declare statusCode?: number;

  /**
   * Error message if the request failed.
   * Contains detailed error information for debugging failed interactions.
   */
  declare error?: string;

  /**
   * Timestamp indicating when the interaction was created.
   * Set automatically on record creation.
   */
  declare createdAt: Date;
}

/**
 * Initialize the AiInteraction model with table schema definition.
 * Defines the structure, constraints, database mapping, and hooks for the model.
 */
AiInteraction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key UUID for the AI interaction record',
    },
    providerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'provider_id',
      references: {
        model: 'ai_providers',
        key: 'id',
      },
      comment: 'Foreign key reference to the AI provider',
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Model name used for the AI interaction',
    },
    request: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Complete request payload sent to the AI provider',
    },
    response: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Complete response received from the AI provider',
    },
    promptTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'prompt_tokens',
      comment: 'Number of tokens used in the input prompt',
    },
    completionTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'completion_tokens',
      comment: 'Number of tokens generated in the completion',
    },
    totalTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'total_tokens',
      comment: 'Total tokens consumed (prompt + completion)',
    },
    responseTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'response_time_ms',
      comment: 'Response time in milliseconds for the API request',
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'status_code',
      comment: 'HTTP status code returned by the API request',
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if the request failed',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp when the interaction was created',
    },
  },
  {
    sequelize,
    tableName: 'ai_interactions',
    timestamps: false, // We only have createdAt, not updatedAt
    underscored: true,
    indexes: [
      {
        fields: ['provider_id'],
        name: 'ai_interactions_provider_id_idx',
      },
      {
        fields: ['model'],
        name: 'ai_interactions_model_idx',
      },
      {
        fields: ['status_code'],
        name: 'ai_interactions_status_code_idx',
      },
      {
        fields: ['created_at'],
        name: 'ai_interactions_created_at_idx',
      },
    ],
    comment: 'API interactions table for logging AI API requests and responses',
    hooks: {
      /**
       * Hook executed after creating an AiInteraction record.
       * Emits a realtime event after the transaction commits (if present).
       */
      afterCreate: async (instance: AiInteraction, options: Record<string, unknown>) => {
        const emit = () =>
          broker.emitMessageCreated({
            id: instance.id,
            createdAt: instance.createdAt,
            model: instance.model,
            promptTokens: instance.promptTokens ?? null,
            completionTokens: instance.completionTokens ?? null,
            totalTokens: instance.totalTokens ?? null,
            responseTimeMs: instance.responseTimeMs ?? null,
            statusCode: instance.statusCode ?? null,
            error: instance.error ?? null,
            request: instance.request,
            response: instance.response,
          });

        const tx = options?.transaction as { afterCommit?: (_fn: () => void) => void } | undefined;
        if (tx?.afterCommit) {
          tx.afterCommit(() => emit());
        } else {
          emit();
        }
      },

      /**
       * Hook executed before updating an AiInteraction record.
       * Captures the original state before changes are applied.
       */
      beforeUpdate: async (instance: AiInteraction) => {
        // Debug: console.log('[Hook] Before update: AI interaction record with id', instance.id, 'being updated');
        void instance; // Prevent unused parameter warning
      },

      /**
       * Hook executed after updating an AiInteraction record.
       * Logs the new state after changes have been applied.
       */
      afterUpdate: async (instance: AiInteraction) => {
        // Debug: console.log('[Hook] After update: AI interaction record with id', instance.id, 'updated');
        void instance; // Prevent unused parameter warning
      },
    },
  }
);
