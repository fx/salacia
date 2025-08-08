/**
 * Temporary stub database exports to maintain compatibility
 * during Drizzle to Sequelize migration. 
 * 
 * This will be fully removed in a future phase once AI service
 * is refactored to use Sequelize.
 */

// Temporary stub - AI service will be refactored in later phase
export const db = {
  select() { throw new Error('Drizzle db not available - use Sequelize instead'); },
  insert() { throw new Error('Drizzle db not available - use Sequelize instead'); }
};

// Stub functions to prevent build errors
export async function testConnection(): Promise<boolean> {
  // Use Sequelize connection instead
  const { testSequelizeConnection } = await import('./sequelize-connection.js');
  return testSequelizeConnection();
}

export async function closeConnection(): Promise<void> {
  // Use Sequelize connection instead  
  const { closeSequelizeConnection } = await import('./sequelize-connection.js');
  return closeSequelizeConnection();
}