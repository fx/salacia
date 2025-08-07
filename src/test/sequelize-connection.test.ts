import { describe, it, expect, afterAll } from 'vitest';
import { testSequelizeConnection, closeSequelizeConnection } from '../lib/db/sequelize-connection';

describe('Sequelize Connection', () => {
  afterAll(async () => {
    await closeSequelizeConnection();
  });

  it('should connect to the database successfully', async () => {
    // Ensure the DATABASE_URL environment variable is set for testing
    if (!process.env.DATABASE_URL) {
      // Skip the test if DATABASE_URL is not set
      console.warn('Skipping test: DATABASE_URL environment variable is not set.');
      return;
    }

    // Test the connection
    const result = await testSequelizeConnection();
    expect(result).toBe(true);
  });
});
