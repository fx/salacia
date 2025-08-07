import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../sequelize-connection';

/**
 * Sequelize model for the health_checks table.
 * Records health check results and system status over time.
 *
 * This model provides an ORM interface for tracking system health monitoring,
 * including database connectivity, response times, and overall system status.
 *
 * @example
 * ```typescript
 * // Create new health check record
 * const healthCheck = await HealthCheck.create({
 *   status: 'healthy',
 *   databaseStatus: true,
 *   responseTime: 125,
 *   details: { memory: '85%', cpu: '45%' }
 * });
 *
 * // Find recent unhealthy checks
 * const unhealthyChecks = await HealthCheck.findAll({
 *   where: { status: 'unhealthy' },
 *   order: [['createdAt', 'DESC']],
 *   limit: 10
 * });
 * ```
 */
export class HealthCheck extends Model<
  InferAttributes<HealthCheck>,
  InferCreationAttributes<HealthCheck>
> {
  /**
   * Primary key UUID for the health check record.
   * Generated automatically using PostgreSQL's gen_random_uuid() function.
   */
  declare id: string;

  /**
   * Overall system health status.
   * Valid values: 'healthy', 'degraded', 'unhealthy'
   * Maximum length: 20 characters.
   */
  declare status: string;

  /**
   * Database connectivity status.
   * True indicates successful database connection and operation.
   */
  declare databaseStatus: boolean;

  /**
   * Time taken for the health check to complete in milliseconds.
   * Measures overall system responsiveness during the health check.
   */
  declare responseTime: number;

  /**
   * Additional health check details and metrics.
   * Stored as JSON for flexible structure containing system metrics,
   * error messages, or other diagnostic information.
   */
  declare details?: Record<string, unknown>;

  /**
   * Timestamp indicating when the health check was performed.
   * Set automatically on record creation.
   */
  declare createdAt: Date;
}

/**
 * Initialize the HealthCheck model with table schema definition.
 * Defines the structure, constraints, and database mapping for the model.
 */
HealthCheck.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key UUID for the health check record',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['healthy', 'degraded', 'unhealthy']],
      },
      comment: 'Overall system health status (healthy, degraded, unhealthy)',
    },
    databaseStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'database_status',
      comment: 'Database connectivity status',
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'response_time_ms',
      validate: {
        min: 0,
      },
      comment: 'Time taken for the health check to complete in milliseconds',
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional health check details and metrics',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp when the health check was performed',
    },
  },
  {
    sequelize,
    tableName: 'health_checks',
    timestamps: true, // Enable timestamps
    updatedAt: false, // Only using createdAt, not updatedAt
    underscored: true,
    indexes: [
      {
        fields: ['status'],
        name: 'health_checks_status_idx',
      },
      {
        fields: ['database_status'],
        name: 'health_checks_database_status_idx',
      },
      {
        fields: ['created_at'],
        name: 'health_checks_created_at_idx',
      },
      {
        fields: ['response_time_ms'],
        name: 'health_checks_response_time_idx',
      },
    ],
    comment: 'Health check logs table for tracking system health status',
  }
);
