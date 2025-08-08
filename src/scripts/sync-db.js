#!/usr/bin/env node

/**
 * Database synchronization script for CI/CD.
 * Creates database tables based on Sequelize model definitions.
 */

import { Sequelize, DataTypes } from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create Sequelize instance
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 10,
    min: 2,
    idle: 30000,
    acquire: 60000,
  },
});

// Define AiInteraction model
const AiInteraction = sequelize.define('AiInteraction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  providerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'provider_id',
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  request: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  response: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  promptTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'prompt_tokens',
  },
  completionTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'completion_tokens',
  },
  totalTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_tokens',
  },
  responseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'response_time_ms',
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'status_code',
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'ai_interactions',
  timestamps: false,
  underscored: true,
});

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection authenticated successfully');
    
    // Sync models
    await sequelize.sync({ force: false });
    console.log('Sequelize sync complete');
    
    // Close connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Database sync failed:', error);
    process.exit(1);
  }
}

syncDatabase();