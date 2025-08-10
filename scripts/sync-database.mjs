#!/usr/bin/env node

/**
 * Database synchronization script for Sequelize.
 * This script imports the built sequelize instance and synchronizes the database schema.
 */

import { s as sequelize } from '../dist/server/chunks/AiInteraction_CqTeHP_I.mjs';

try {
  console.log('Starting database synchronization...');
  await sequelize.sync();
  console.log('Database synchronization completed successfully.');
  process.exit(0);
} catch (error) {
  console.error('Database synchronization failed:', error);
  process.exit(1);
}