import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../sequelize-connection';

/**
 * Sequelize model for the system_metadata table.
 * Stores key-value pairs for application configuration and runtime data.
 *
 * This model provides an ORM interface for managing system metadata,
 * including application settings, configuration values, and runtime information.
 *
 * @example
 * ```typescript
 * // Create new system metadata
 * const metadata = await SystemMetadata.create({
 *   key: 'app_version',
 *   value: '1.0.0',
 *   description: 'Current application version'
 * });
 *
 * // Find by key
 * const version = await SystemMetadata.findOne({ where: { key: 'app_version' } });
 * ```
 */
export class SystemMetadata extends Model<
  InferAttributes<SystemMetadata>,
  InferCreationAttributes<SystemMetadata>
> {
  /**
   * Primary key UUID for the system metadata record.
   * Generated automatically using PostgreSQL's gen_random_uuid() function.
   */
  declare id: string;

  /**
   * Unique key identifier for the metadata entry.
   * Used to retrieve specific configuration values.
   * Maximum length: 255 characters.
   */
  declare key: string;

  /**
   * The value associated with the key.
   * Stored as text to accommodate various data types and lengths.
   */
  declare value: string;

  /**
   * Optional human-readable description of the metadata entry.
   * Provides context about the purpose and usage of the key-value pair.
   */
  declare description?: string;

  /**
   * Timestamp indicating when the record was created.
   * Set automatically on record creation.
   */
  declare createdAt: Date;

  /**
   * Timestamp indicating when the record was last updated.
   * Updated automatically whenever the record is modified.
   */
  declare updatedAt: Date;
}

/**
 * Initialize the SystemMetadata model with table schema definition.
 * Defines the structure, constraints, and database mapping for the model.
 */
SystemMetadata.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key UUID for the system metadata record',
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Unique key identifier for the metadata entry',
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The value associated with the key',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional description of the metadata entry',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the record was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the record was last updated',
    },
  },
  {
    sequelize,
    tableName: 'system_metadata',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['key'],
        name: 'system_metadata_key_unique',
      },
    ],
    comment: 'System metadata table for tracking application information and settings',
  }
);
