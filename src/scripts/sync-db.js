#!/usr/bin/env node

/**
 * Database synchronization script for CI/CD.
 * Creates database tables based on Sequelize model definitions.
 */

import { synchronizeSequelize } from '../lib/db/sequelize-connection.js';
import '../lib/db/models/index.js'; // Ensure all models are loaded

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');
    await synchronizeSequelize(false, false); // Don't force, don't alter
    console.log('Sequelize sync complete');
    process.exit(0);
  } catch (error) {
    console.error('Database sync failed:', error);
    process.exit(1);
  }
}

syncDatabase();