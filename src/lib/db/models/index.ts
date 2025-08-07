import { SystemMetadata } from './SystemMetadata';
import { ApiRequest } from './ApiRequest';

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
 * Currently, SystemMetadata and ApiRequest are independent tables
 * without direct relationships, but this function is prepared for
 * future associations as the schema evolves.
 *
 * @remarks
 * Associations should be defined here to ensure they are set up
 * before any model operations are performed. This prevents issues
 * with missing associations during application startup.
 */
function setupAssociations(): void {
  // SystemMetadata and ApiRequest are currently independent tables
  // Future associations can be added here as the schema evolves
  // Example of how to add associations:
  // SystemMetadata.hasMany(SomeOtherModel, {
  //   foreignKey: 'systemMetadataId',
  //   as: 'relatedRecords',
  // });
}

// Initialize associations
setupAssociations();

/**
 * Export all Sequelize models.
 * These models provide ORM interfaces for database operations.
 */
export { SystemMetadata, ApiRequest };

/**
 * Export model classes for type checking and instance operations.
 * Use these when you need to check model instances or perform
 * model-specific operations.
 */
export type { SystemMetadata as SystemMetadataModel, ApiRequest as ApiRequestModel };
