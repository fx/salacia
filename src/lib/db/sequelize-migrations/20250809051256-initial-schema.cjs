'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ai_providers table
    await queryInterface.createTable('ai_providers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      api_key: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      base_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      models: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create ai_interactions table
    await queryInterface.createTable('ai_interactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ai_providers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      request: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      response: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      prompt_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completion_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      total_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create api_requests table
    await queryInterface.createTable('api_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      path: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      headers: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      query: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create health_checks table
    await queryInterface.createTable('health_checks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      database_status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      response_time: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create system_metadata table
    await queryInterface.createTable('system_metadata', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for ai_providers
    await queryInterface.addIndex('ai_providers', ['name'], {
      unique: true,
      name: 'ai_providers_name_unique',
    });
    await queryInterface.addIndex('ai_providers', ['type'], {
      name: 'ai_providers_type_idx',
    });
    await queryInterface.addIndex('ai_providers', ['is_active'], {
      name: 'ai_providers_is_active_idx',
    });
    await queryInterface.addIndex('ai_providers', ['is_default'], {
      name: 'ai_providers_is_default_idx',
    });

    // Add indexes for ai_interactions
    await queryInterface.addIndex('ai_interactions', ['provider_id'], {
      name: 'ai_interactions_provider_id_idx',
    });
    await queryInterface.addIndex('ai_interactions', ['model'], {
      name: 'ai_interactions_model_idx',
    });
    await queryInterface.addIndex('ai_interactions', ['status_code'], {
      name: 'ai_interactions_status_code_idx',
    });
    await queryInterface.addIndex('ai_interactions', ['created_at'], {
      name: 'ai_interactions_created_at_idx',
    });

    // Add indexes for api_requests
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

    // Add indexes for health_checks
    await queryInterface.addIndex('health_checks', ['status'], {
      name: 'health_checks_status_idx',
    });
    await queryInterface.addIndex('health_checks', ['created_at'], {
      name: 'health_checks_created_at_idx',
    });

    // Add indexes for system_metadata
    await queryInterface.addIndex('system_metadata', ['key'], {
      unique: true,
      name: 'system_metadata_key_unique',
    });
  },

  async down(queryInterface) {
    // Drop tables in reverse order of creation to handle foreign key constraints
    await queryInterface.dropTable('ai_interactions');
    await queryInterface.dropTable('ai_providers');
    await queryInterface.dropTable('api_requests');
    await queryInterface.dropTable('health_checks');
    await queryInterface.dropTable('system_metadata');
  },
};