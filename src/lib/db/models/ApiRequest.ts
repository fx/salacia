import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../sequelize-connection';

/**
 * Sequelize model for the api_requests table.
 * Tracks all incoming API requests for monitoring and debugging purposes.
 *
 * This model provides an ORM interface for logging and analyzing API requests,
 * including request metadata, timing information, and response data.
 *
 * @example
 * ```typescript
 * // Log a new API request
 * const apiRequest = await ApiRequest.create({
 *   method: 'GET',
 *   path: '/api/users',
 *   headers: { 'user-agent': 'Mozilla/5.0...' },
 *   statusCode: 200,
 *   responseTime: 156
 * });
 *
 * // Find slow requests
 * const slowRequests = await ApiRequest.findAll({
 *   where: { responseTime: { [Op.gt]: 1000 } }
 * });
 * ```
 */
export class ApiRequest extends Model<
  InferAttributes<ApiRequest>,
  InferCreationAttributes<ApiRequest>
> {
  /**
   * Primary key UUID for the API request record.
   * Generated automatically using PostgreSQL's gen_random_uuid() function.
   */
  declare id: string;

  /**
   * HTTP method used for the request (GET, POST, PUT, DELETE, etc.).
   * Maximum length: 10 characters.
   */
  declare method: string;

  /**
   * Request path/endpoint that was accessed.
   * Maximum length: 500 characters.
   */
  declare path: string;

  /**
   * HTTP headers sent with the request.
   * Stored as JSON for flexible structure.
   */
  declare headers?: Record<string, unknown>;

  /**
   * Query parameters from the request URL.
   * Stored as JSON for flexible structure.
   */
  declare query?: Record<string, unknown>;

  /**
   * Request body content.
   * Stored as JSON for flexible structure.
   */
  declare body?: Record<string, unknown>;

  /**
   * User agent string from the request headers.
   * Maximum length: 500 characters.
   */
  declare userAgent?: string;

  /**
   * IP address of the client making the request.
   * Supports both IPv4 and IPv6 addresses.
   * Maximum length: 45 characters (IPv6 with brackets).
   */
  declare ipAddress?: string;

  /**
   * HTTP status code returned in the response.
   * Standard HTTP status codes (200, 404, 500, etc.).
   */
  declare statusCode?: number;

  /**
   * Time taken to process the request in milliseconds.
   * Measured from request start to response completion.
   */
  declare responseTime?: number;

  /**
   * Size of the response body in bytes.
   * Used for bandwidth and performance monitoring.
   */
  declare responseSize?: number;

  /**
   * Timestamp indicating when the request was received.
   * Set automatically on record creation.
   */
  declare createdAt: Date;
}

/**
 * Initialize the ApiRequest model with table schema definition.
 * Defines the structure, constraints, and database mapping for the model.
 */
ApiRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key UUID for the API request record',
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'HTTP method used for the request',
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Request path/endpoint that was accessed',
    },
    headers: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'HTTP headers sent with the request',
    },
    query: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Query parameters from the request URL',
    },
    body: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Request body content',
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_agent',
      comment: 'User agent string from the request headers',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
      comment: 'IP address of the client making the request',
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'status_code',
      comment: 'HTTP status code returned in the response',
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'response_time_ms',
      comment: 'Time taken to process the request in milliseconds',
    },
    responseSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'response_size_bytes',
      comment: 'Size of the response body in bytes',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp when the request was received',
    },
  },
  {
    sequelize,
    tableName: 'api_requests',
    timestamps: false, // Only using createdAt, not updatedAt
    underscored: true,
    indexes: [
      {
        fields: ['method'],
        name: 'api_requests_method_idx',
      },
      {
        fields: ['path'],
        name: 'api_requests_path_idx',
      },
      {
        fields: ['status_code'],
        name: 'api_requests_status_code_idx',
      },
      {
        fields: ['created_at'],
        name: 'api_requests_created_at_idx',
      },
    ],
    comment: 'API requests table for logging all incoming API requests',
  }
);
