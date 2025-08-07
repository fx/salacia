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
}

/**
 * Creates Sequelize configuration object based on environment settings.
 *
 * @returns Sequelize configuration with database connection and settings
 */
export function createSequelizeConfig(): SequelizeConfig {
  return {
    connectionString: env.DATABASE_URL,
    dialect: 'postgres',
    logging: env.NODE_ENV === 'development' && env.LOG_LEVEL === 'debug',
    pool: {
      max: 10,
      min: 2,
      idle: 30000, // 30 seconds
      acquire: 60000, // 60 seconds
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: false,
      freezeTableName: true,
    },
  };
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
