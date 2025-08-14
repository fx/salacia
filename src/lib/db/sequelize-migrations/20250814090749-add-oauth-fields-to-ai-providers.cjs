'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ai_providers', 'auth_type', {
      type: Sequelize.ENUM('api_key', 'oauth'),
      allowNull: false,
      defaultValue: 'api_key',
      comment: 'Authentication method for the provider'
    });

    await queryInterface.addColumn('ai_providers', 'oauth_access_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth access token (encrypted)'
    });

    await queryInterface.addColumn('ai_providers', 'oauth_refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth refresh token (encrypted)'
    });

    await queryInterface.addColumn('ai_providers', 'oauth_token_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'OAuth access token expiration timestamp'
    });

    await queryInterface.addColumn('ai_providers', 'oauth_scope', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'OAuth scope granted for the access token'
    });

    await queryInterface.addColumn('ai_providers', 'oauth_client_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'OAuth client ID for this provider'
    });

    // Update API key to be nullable since OAuth providers won't have it
    await queryInterface.changeColumn('ai_providers', 'api_key', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'API key for authenticating with the provider (nullable for OAuth)'
    });

    // Add index for auth_type
    await queryInterface.addIndex('ai_providers', ['auth_type'], {
      name: 'ai_providers_auth_type_idx',
    });

    // Add index for oauth_token_expires_at for token refresh queries
    await queryInterface.addIndex('ai_providers', ['oauth_token_expires_at'], {
      name: 'ai_providers_oauth_token_expires_at_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('ai_providers', 'ai_providers_oauth_token_expires_at_idx');
    await queryInterface.removeIndex('ai_providers', 'ai_providers_auth_type_idx');
    
    // Revert API key to be non-nullable
    await queryInterface.changeColumn('ai_providers', 'api_key', {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'API key for authenticating with the provider'
    });

    // Remove OAuth columns
    await queryInterface.removeColumn('ai_providers', 'oauth_client_id');
    await queryInterface.removeColumn('ai_providers', 'oauth_scope');
    await queryInterface.removeColumn('ai_providers', 'oauth_token_expires_at');
    await queryInterface.removeColumn('ai_providers', 'oauth_refresh_token');
    await queryInterface.removeColumn('ai_providers', 'oauth_access_token');
    await queryInterface.removeColumn('ai_providers', 'auth_type');
    
    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ai_providers_auth_type";');
  },
};