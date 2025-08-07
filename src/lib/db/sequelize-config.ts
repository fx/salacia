// Sequelize configuration types
import { env } from '../env';

/**
 * Sequelize database configuration options.
 * Defines connection settings, logging, and pool configuration.
 */
export interface SequelizeConfig {
  /** Database connection URL */
  connectionString: string;
  /** Database dialect */
  dialect: 'postgres';
  /** Logging configuration */
  logging: boolean | ((_sql: string, _timing?: number) => void);
  /** Connection pool settings */
  pool: {
    /** Maximum number of connections in pool */
    max: number;
    /** Minimum number of connections in pool */
    min: number;
    /** Maximum time, in milliseconds, that a connection can be idle before being released */
    idle: number;
    /** Maximum time, in milliseconds, that pool will try to get connection before throwing error */
    acquire: number;
  };
  /** Define associations automatically */
  define: {
    /** Add timestamps (createdAt, updatedAt) to all models */
    timestamps: boolean;
    /** Use snake_case for automatically added attributes */
    underscored: boolean;
    /** Don't delete database entries but set the deletedAt timestamp */
    paranoid: boolean;
    /** Convert camelCase columns to snake_case field names */
    freezeTableName: boolean;
  };
  /** Dialect-specific options */
  dialectOptions?: {
    /** SSL configuration for database connection */
    ssl?:
      | {
          /** Require SSL connection */
          require: boolean;
          /** Reject unauthorized SSL certificates */
          rejectUnauthorized: boolean;
        }
      | false;
  };
}

/**
 * Creates Sequelize configuration object based on environment settings.
 *
 * @returns Sequelize configuration with database connection and settings
 */
export function createSequelizeConfig(): SequelizeConfig {
  const config: SequelizeConfig = {
    connectionString: env.DATABASE_URL,
    dialect: 'postgres',
    logging: env.NODE_ENV === 'development' && env.LOG_LEVEL === 'debug',
    pool: {
      max: env.NODE_ENV === 'production' ? 20 : 10,
      min: env.NODE_ENV === 'production' ? 5 : 2,
      idle: 30000, // 30 seconds
      acquire: 60000, // 60 seconds
    },
    define: {
      timestamps: true,
      underscored: true,
      // Soft deletes (paranoid mode) are intentionally disabled; records will be permanently deleted.
      paranoid: false,
      freezeTableName: true,
    },
  };

  // Add SSL configuration for production
  if (env.NODE_ENV === 'production') {
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: true,
      },
    };
  }

  return config;
}

/**
 * Default Sequelize configuration instance.
 * Uses environment variables for database connection.
 */
export const sequelizeConfig = createSequelizeConfig();

/**
 * Type definition for Sequelize database configuration.
 * Provides type safety for configuration usage throughout the application.
 */
export type SequelizeConfigType = typeof sequelizeConfig;
