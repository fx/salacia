import { describe, it, expect, afterAll } from 'vitest';
import { testSequelizeConnection, closeSequelizeConnection } from '../lib/db/sequelize-connection';

describe('Sequelize Connection', () => {
  afterAll(async () => {
    await closeSequelizeConnection();
  });

  it('should connect to the database successfully', async () => {
    // Set up the database URL for testing
    process.env.DATABASE_URL = 'postgresql://salacia:salacia_dev_password@localhost:5432/salacia';

    // Test the connection
    const result = await testSequelizeConnection();
    expect(result).toBe(true);
  });
});
