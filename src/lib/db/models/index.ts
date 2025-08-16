import { SystemMetadata } from './SystemMetadata';
import { ApiRequest } from './ApiRequest';
import { HealthCheck } from './HealthCheck';
import { AiProvider } from './AiProvider';
import { AiInteraction } from './AiInteraction';

/**
 * Sequelize model exports and associations.
 *
 * This module provides centralized access to all Sequelize models and defines
 * the relationships between them. Import models from this file to ensure
 * associations are properly set up.
 *
 * @example
 * ```typescript
 * import { SystemMetadata, ApiRequest } from '@/lib/db/models';
 *
 * // Use models with proper associations
 * const metadata = await SystemMetadata.findByPk('some-id');
 * const requests = await ApiRequest.findAll({ limit: 10 });
 * ```
 */

/**
 * Define model associations.
 * Sets up relationships between models based on the database schema.
 *
 * @remarks
 * Associations should be defined here to ensure they are set up
 * before any model operations are performed. This prevents issues
 * with missing associations during application startup.
 */
function setupAssociations(): void {
  // SystemMetadata, ApiRequest, and HealthCheck are independent tables
  // without direct relationships to other models

  // Set up relationship between AiProvider and AiInteraction
  AiProvider.hasMany(AiInteraction, {
    foreignKey: 'providerId',
    as: 'interactions',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  AiInteraction.belongsTo(AiProvider, {
    foreignKey: 'providerId',
    as: 'provider',
  });
}

// Track if associations have been set up to prevent duplicates
let associationsSetup = false;

// Initialize associations only once
if (!associationsSetup) {
  setupAssociations();
  associationsSetup = true;
}

/**
 * Export all Sequelize models.
 * These models provide ORM interfaces for database operations.
 */
export { SystemMetadata, ApiRequest, HealthCheck, AiProvider, AiInteraction };

/**
 * Export model classes for type checking and instance operations.
 * Use these when you need to check model instances or perform
 * model-specific operations.
 */
export type {
  SystemMetadata as SystemMetadataModel,
  ApiRequest as ApiRequestModel,
  HealthCheck as HealthCheckModel,
  AiProvider as AiProviderModel,
  AiInteraction as AiInteractionModel,
};
