/**
 * Temporary stub database connection to maintain compatibility
 * during Drizzle to Sequelize migration.
 * 
 * This will be fully removed in a future phase once AI service
 * is refactored to use Sequelize models.
 */

// Stub database connection - AI service will be refactored to use Sequelize
export const db = {
  select(): any { 
    return { 
      from(): any { 
        return { 
          where(): any { 
            return []; 
          } 
        }; 
      } 
    }; 
  },
  insert(): any { 
    return { 
      values(): any { 
        return Promise.resolve(); 
      } 
    }; 
  }
};

export async function testConnection(): Promise<boolean> {
  // Stub implementation - will be removed when AI service is refactored
  return false;
}

export async function closeConnection(): Promise<void> {
  // Stub implementation - will be removed when AI service is refactored
  return;
}