import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';

/**
 * Creates a PostgreSQL connection using the configured database URL.
 *
 * @returns PostgreSQL client instance
 */
function createConnection() {
  const client = postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return client;
}

/**
 * Database connection instance configured with Drizzle ORM.
 * Uses connection pooling and automatic cleanup.
 */
const connection = createConnection();

/**
 * Drizzle ORM database instance.
 * Provides type-safe database operations and query building.
 */
export const db = drizzle(connection);

/**
 * Closes the database connection gracefully.
 * Should be called when the application shuts down.
 */
export async function closeConnection(): Promise<void> {
  await connection.end();
}

/**
 * Tests the database connection by executing a simple query.
 *
 * @returns Promise that resolves to true if connection is successful
 * @throws Error if connection fails
 */
export async function testConnection(): Promise<boolean> {
  try {
    await connection`SELECT 1 as test`;
    return true;
  } catch (error) {
    throw new Error(
      `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
