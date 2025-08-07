/**
 * Simple test script to verify Sequelize models can be instantiated.
 * This is a basic smoke test to ensure the models are properly configured.
 *
 * Run this with: `node --loader ts-node/esm src/lib/db/models/test-models.ts`
 */

import { SystemMetadata, ApiRequest } from './index';
import { testSequelizeConnection } from '../sequelize-connection';

/**
 * Test function to verify models can be instantiated and connection works.
 */
async function testModels(): Promise<void> {
  try {
    console.warn('Testing Sequelize connection...');
    await testSequelizeConnection();
    console.warn('✅ Connection successful');

    console.warn('Testing SystemMetadata model...');
    const _systemMetadataInstance = SystemMetadata.build({
      key: 'test_key',
      value: 'test_value',
      description: 'Test description',
    });
    console.warn('✅ SystemMetadata model instantiated successfully');

    console.warn('Testing ApiRequest model...');
    const _apiRequestInstance = ApiRequest.build({
      method: 'GET',
      path: '/test',
      headers: { 'user-agent': 'test' },
      statusCode: 200,
      responseTime: 100,
    });
    console.warn('✅ ApiRequest model instantiated successfully');

    console.warn('🎉 All model tests passed!');
  } catch (error) {
    console.error('❌ Model test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testModels();
}
