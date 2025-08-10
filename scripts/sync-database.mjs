#!/usr/bin/env node

/**
 * Database synchronization script for Sequelize.
 * This script runs migrations instead of sync to handle complex dependencies.
 */

import { spawn } from 'child_process';

try {
  console.log('Starting database migration...');
  
  // Run the migration command using sequelize-cli
  const migration = spawn('npm', ['run', 'sequelize:migrate:up'], {
    stdio: 'inherit',
    shell: true
  });

  migration.on('close', (code) => {
    if (code === 0) {
      console.log('Database migration completed successfully.');
      process.exit(0);
    } else {
      console.error('Database migration failed with exit code:', code);
      process.exit(1);
    }
  });

  migration.on('error', (error) => {
    console.error('Failed to start migration process:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('Database migration failed:', error);
  process.exit(1);
}