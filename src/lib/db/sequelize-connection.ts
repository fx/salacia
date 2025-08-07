import { Sequelize } from 'sequelize';
import { sequelizeConfig } from './sequelize-config';

/**
 * Sequelize database connection singleton.
 * Provides a single instance of Sequelize connection throughout the application.
 * Configured with PostgreSQL dialect and connection pooling.
 */
class SequelizeConnection {
  private static instance: Sequelize | null = null;
  private static isConnected: boolean = false;

  /**
   * Gets the Sequelize connection instance.
   * Creates a new instance if one doesn't exist.
   *
   * @returns Sequelize connection instance
   */
  public static getInstance(): Sequelize {
    if (!SequelizeConnection.instance) {
      SequelizeConnection.instance = new Sequelize(sequelizeConfig.connectionString, {
        dialect: sequelizeConfig.dialect,
        logging: sequelizeConfig.logging,
        pool: sequelizeConfig.pool,
        define: sequelizeConfig.define,
      });
    }

    return SequelizeConnection.instance;
  }

  /**
   * Tests the database connection by authenticating with the database.
   *
   * @returns Promise that resolves to true if connection is successful
   * @throws Error if connection fails
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const sequelize = SequelizeConnection.getInstance();
      await sequelize.authenticate();
      SequelizeConnection.isConnected = true;
      return true;
    } catch (error) {
      SequelizeConnection.isConnected = false;
      throw new Error(
        `Sequelize connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Closes the database connection gracefully.
   * Should be called when the application shuts down.
   *
   * @returns Promise that resolves when connection is closed
   */
  public static async closeConnection(): Promise<void> {
    if (SequelizeConnection.instance) {
      await SequelizeConnection.instance.close();
      SequelizeConnection.instance = null;
      SequelizeConnection.isConnected = false;
    }
  }

  /**
   * Returns the current connection status.
   *
   * @returns True if connection has been successfully tested
   */
  public static getConnectionStatus(): boolean {
    return SequelizeConnection.isConnected;
  }

  /**
   * Synchronizes all defined models with the database.
   * Creates tables if they don't exist.
   *
   * @param force - If true, drops existing tables before creating new ones
   * @param alter - If true, modifies existing tables to match model definitions
   * @returns Promise that resolves when synchronization is complete
   */
  public static async synchronize(force: boolean = false, alter: boolean = false): Promise<void> {
    const sequelize = SequelizeConnection.getInstance();
    await sequelize.sync({ force, alter });
  }
}

/**
 * Exports the Sequelize connection instance.
 * Use this for all database operations throughout the application.
 */
export const sequelize = SequelizeConnection.getInstance();

/**
 * Exports connection management functions.
 */
export const {
  testConnection: testSequelizeConnection,
  closeConnection: closeSequelizeConnection,
  getConnectionStatus: getSequelizeConnectionStatus,
  synchronize: synchronizeSequelize,
} = SequelizeConnection;
