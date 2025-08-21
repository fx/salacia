'use strict';

/**
 * Migration: Create api_requests table
 * Mirrors src/lib/db/models/ApiRequest.ts
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotent: skip if table already exists
    const [{ exists }] = await queryInterface.sequelize
      .query("SELECT to_regclass('public.api_requests') IS NOT NULL AS exists;")
      .then(([rows]) => rows);

    if (exists) {
      return;
    }

    const { DataTypes } = Sequelize;

    await queryInterface.createTable('api_requests', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        comment: 'Primary key UUID for the API request record',
      },
      method: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'HTTP method used for the request',
      },
      path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Request path/endpoint that was accessed',
      },
      headers: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'HTTP headers sent with the request',
      },
      query: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Query parameters from the request URL',
      },
      body: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Request body content',
      },
      user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'User agent string from the request headers',
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP address of the client making the request',
      },
      status_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'HTTP status code returned in the response',
      },
      response_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time taken to process the request in milliseconds',
      },
      response_size_bytes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Size of the response body in bytes',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp when the request was received',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Not used by model (updatedAt disabled), present for consistency',
      },
    });

    await queryInterface.addIndex('api_requests', ['method'], {
      name: 'api_requests_method_idx',
    });
    await queryInterface.addIndex('api_requests', ['path'], {
      name: 'api_requests_path_idx',
    });
    await queryInterface.addIndex('api_requests', ['status_code'], {
      name: 'api_requests_status_code_idx',
    });
    await queryInterface.addIndex('api_requests', ['created_at'], {
      name: 'api_requests_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_requests');
  },
};
