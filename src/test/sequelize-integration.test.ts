import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import { testSequelizeConnection, closeSequelizeConnection } from '../lib/db/sequelize-connection';
import { AiInteraction, AiProvider } from '../lib/db/models';
import { MessagesSequelizeService } from '../lib/services/messages-sequelize';
import type { MessagesFilterParams } from '../lib/types/messages';
import type { MessagesCursorPaginationParams } from '../lib/types/cursor';
import { testUtils } from './setup';

/**
 * Comprehensive integration tests for the Sequelize migration.
 *
 * Tests verify:
 * 1. Sequelize models can connect to database
 * 2. CRUD operations work on all models
 * 3. Hooks are triggered on AiInteraction updates
 * 4. Service layer returns correct data
 * 5. API endpoints work with USE_SEQUELIZE=true
 */
describe('Sequelize Integration Tests', () => {
  let originalConsole: typeof console;
  let consoleLogSpy: MockInstance;
  let hookCalls: string[] = [];

  beforeAll(async () => {
    // Skip tests if DATABASE_URL is not set
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping Sequelize integration tests: DATABASE_URL not set');
      return;
    }

    // Set up environment for Sequelize usage
    process.env.USE_SEQUELIZE = 'true';

    // Mock console to capture hook calls
    originalConsole = testUtils.mockConsole();
    consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation((message: string, ...args: unknown[]) => {
        if (message.includes('[Hook]')) {
          hookCalls.push(`${message} ${args.join(' ')}`);
        }
      });

    // Test the connection
    const connected = await testSequelizeConnection();
    expect(connected).toBe(true);
  });

  afterAll(async () => {
    if (originalConsole) {
      testUtils.restoreConsole(originalConsole);
    }
    await closeSequelizeConnection();
  });

  beforeEach(() => {
    hookCalls = [];
    consoleLogSpy?.mockClear();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await testSequelizeConnection();
      expect(result).toBe(true);
    });

    it('should have models properly initialized', () => {
      if (!process.env.DATABASE_URL) return;

      expect(AiInteraction).toBeDefined();
      expect(AiProvider).toBeDefined();
      expect(typeof AiInteraction.findAll).toBe('function');
      expect(typeof AiProvider.findAll).toBe('function');
    });
  });

  describe('AiProvider CRUD Operations', () => {
    const testProviderId = testUtils.generateTestId();
    const testProviderData = {
      id: testProviderId,
      name: 'test-provider',
      type: 'anthropic' as const,
      baseUrl: 'https://api.anthropic.com',
      apiKey: 'test-key',
      isActive: true,
    };

    it('should create AiProvider record', async () => {
      if (!process.env.DATABASE_URL) return;

      const provider = await AiProvider.create({
        ...testProviderData,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(provider).toBeDefined();
      expect(provider.id).toBe(testProviderId);
      expect(provider.name).toBe('test-provider');
      expect(provider.type).toBe('anthropic');
    });

    it('should read AiProvider record', async () => {
      if (!process.env.DATABASE_URL) return;

      const provider = await AiProvider.findByPk(testProviderId);
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('test-provider');
    });

    it('should update AiProvider record', async () => {
      if (!process.env.DATABASE_URL) return;

      const provider = await AiProvider.findByPk(testProviderId);
      expect(provider).toBeDefined();

      if (provider) {
        await provider.update({ name: 'updated-provider' });
        expect(provider.name).toBe('updated-provider');
      }
    });

    it('should delete AiProvider record', async () => {
      if (!process.env.DATABASE_URL) return;

      const provider = await AiProvider.findByPk(testProviderId);
      expect(provider).toBeDefined();

      if (provider) {
        await provider.destroy();
        const deletedProvider = await AiProvider.findByPk(testProviderId);
        expect(deletedProvider).toBeNull();
      }
    });
  });

  describe('AiInteraction CRUD Operations', () => {
    const testInteractionId = testUtils.generateTestId();
    const testInteractionData = {
      id: testInteractionId,
      model: 'claude-3-sonnet',
      request: { messages: [{ role: 'user', content: 'Hello' }] },
      response: { content: 'Hi there!' },
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      responseTimeMs: 1200,
      statusCode: 200,
    };

    it('should create AiInteraction record', async () => {
      if (!process.env.DATABASE_URL) return;

      const interaction = await AiInteraction.create({
        ...testInteractionData,
        createdAt: new Date(),
      });
      expect(interaction).toBeDefined();
      expect(interaction.id).toBe(testInteractionId);
      expect(interaction.model).toBe('claude-3-sonnet');
      expect(interaction.promptTokens).toBe(10);
    });

    it('should read AiInteraction record', async () => {
      if (!process.env.DATABASE_URL) return;

      const interaction = await AiInteraction.findByPk(testInteractionId);
      expect(interaction).toBeDefined();
      expect(interaction?.model).toBe('claude-3-sonnet');
    });

    it('should update AiInteraction record and trigger hooks', async () => {
      if (!process.env.DATABASE_URL) return;

      const interaction = await AiInteraction.findByPk(testInteractionId);
      expect(interaction).toBeDefined();

      if (interaction) {
        // Clear previous hook calls
        hookCalls = [];

        // Update the interaction
        await interaction.update({
          response: { content: 'Updated response' },
          completionTokens: 8,
          totalTokens: 18,
        });

        // Verify hooks were triggered
        expect(hookCalls).toHaveLength(2);
        expect(hookCalls[0]).toContain('[Hook] Before update');
        expect(hookCalls[1]).toContain('[Hook] After update');
        expect(hookCalls[0]).toContain(testInteractionId);
        expect(hookCalls[1]).toContain(testInteractionId);

        // Verify data was updated
        expect(interaction.completionTokens).toBe(8);
        expect(interaction.totalTokens).toBe(18);
      }
    });

    it('should delete AiInteraction record', async () => {
      if (!process.env.DATABASE_URL) return;

      const interaction = await AiInteraction.findByPk(testInteractionId);
      expect(interaction).toBeDefined();

      if (interaction) {
        await interaction.destroy();
        const deletedInteraction = await AiInteraction.findByPk(testInteractionId);
        expect(deletedInteraction).toBeNull();
      }
    });
  });

  describe('Service Layer Integration', () => {
    const testInteractions = [
      {
        id: `${testUtils.generateTestId()}-1`,
        model: 'gpt-4',
        request: { messages: [{ role: 'user', content: 'Test 1' }] },
        response: { content: 'Response 1' },
        promptTokens: 15,
        completionTokens: 10,
        totalTokens: 25,
        responseTimeMs: 800,
        statusCode: 200,
      },
      {
        id: `${testUtils.generateTestId()}-2`,
        model: 'claude-3-opus',
        request: { messages: [{ role: 'user', content: 'Test 2' }] },
        response: { content: 'Response 2' },
        promptTokens: 20,
        completionTokens: 15,
        totalTokens: 35,
        responseTimeMs: 1200,
        statusCode: 200,
      },
    ];

    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      // Create test interactions
      for (const interaction of testInteractions) {
        await AiInteraction.create({
          ...interaction,
          createdAt: new Date(),
        });
      }
    });

    afterEach(async () => {
      if (!process.env.DATABASE_URL) return;

      // Clean up test interactions
      for (const interaction of testInteractions) {
        await AiInteraction.destroy({ where: { id: interaction.id } });
      }
    });

    it('should retrieve messages with pagination', async () => {
      if (!process.env.DATABASE_URL) return;

      const params = {
        page: 1,
        pageSize: 10,
        sort: { field: 'createdAt' as const, direction: 'desc' as const },
      };

      const result = await MessagesSequelizeService.getMessages(params);
      expect(result).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.messages.length).toBeGreaterThanOrEqual(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalItems).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve message by ID', async () => {
      if (!process.env.DATABASE_URL) return;

      const message = await MessagesSequelizeService.getMessageById(testInteractions[0].id);
      expect(message).toBeDefined();
      expect(message?.id).toBe(testInteractions[0].id);
      expect(message?.model).toBe('gpt-4');
    });

    it('should handle cursor-based pagination', async () => {
      if (!process.env.DATABASE_URL) return;

      const params: MessagesCursorPaginationParams = {
        limit: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      };

      const result = await MessagesSequelizeService.getMessagesWithCursor(params);
      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.meta).toBeDefined();
      expect(result.cursors).toBeDefined();
    });

    it('should filter messages correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      const filters: MessagesFilterParams = {
        model: 'gpt-4',
      };

      const params = {
        page: 1,
        pageSize: 10,
        sort: { field: 'createdAt' as const, direction: 'desc' as const },
      };

      const result = await MessagesSequelizeService.getMessages(params, filters);
      expect(result.messages).toBeInstanceOf(Array);

      // Should contain at least our test message
      const gpt4Messages = result.messages.filter(msg => msg.model === 'gpt-4');
      expect(gpt4Messages.length).toBeGreaterThanOrEqual(1);
    });

    it('should return statistics', async () => {
      if (!process.env.DATABASE_URL) return;

      const stats = await MessagesSequelizeService.getFilteredStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalMessages).toBe('number');
      expect(typeof stats.successfulMessages).toBe('number');
      expect(typeof stats.failedMessages).toBe('number');
      expect(typeof stats.totalTokens).toBe('number');
      expect(stats.totalMessages).toBeGreaterThanOrEqual(2);
    });
  });

  describe('API Endpoint Integration', () => {
    it('should handle API requests with USE_SEQUELIZE=true', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create a mock API route handler similar to the actual implementation
      const mockAPIHandler = async (url: globalThis.URL) => {
        const params: MessagesCursorPaginationParams = {
          limit: parseInt(url.searchParams.get('limit') || '20'),
          cursor: url.searchParams.get('cursor') || undefined,
          sortBy: (url.searchParams.get('sortBy') as 'createdAt' | 'id') || 'createdAt',
          sortDirection: (url.searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
        };

        const filters: MessagesFilterParams = {};
        const model = url.searchParams.get('model');
        if (model) filters.model = model;

        // Use Sequelize service
        const result = await MessagesSequelizeService.getMessagesWithCursor(params, filters);

        return {
          items: result.data,
          hasMore: result.meta.hasMore,
          nextCursor: result.cursors.next,
          prevCursor: result.cursors.prev,
        };
      };

      // Test the API handler
      const testUrl = new globalThis.URL('http://localhost/api/messages?limit=10&sortBy=createdAt');
      const response = await mockAPIHandler(testUrl);

      expect(response).toBeDefined();
      expect(response.items).toBeInstanceOf(Array);
      expect(typeof response.hasMore).toBe('boolean');
    });

    it('should handle API errors gracefully', async () => {
      if (!process.env.DATABASE_URL) return;

      // Test with invalid UUID
      try {
        await MessagesSequelizeService.getMessageById('invalid-uuid');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid UUID format');
      }
    });

    it('should validate pagination parameters', async () => {
      if (!process.env.DATABASE_URL) return;

      // Test with invalid page size
      try {
        await MessagesSequelizeService.getMessages({
          page: 1,
          pageSize: 150, // Above limit
          sort: { field: 'createdAt', direction: 'desc' },
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Page size must be between 1 and 100');
      }
    });
  });

  describe('Model Associations', () => {
    const testProviderId = testUtils.generateTestId();
    const testInteractionId = testUtils.generateTestId();

    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      // Create provider first
      await AiProvider.create({
        id: testProviderId,
        name: 'test-association-provider',
        type: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create interaction with provider reference
      await AiInteraction.create({
        id: testInteractionId,
        providerId: testProviderId,
        model: 'gpt-3.5-turbo',
        request: { messages: [{ role: 'user', content: 'Association test' }] },
        response: { content: 'Response' },
        statusCode: 200,
        createdAt: new Date(),
      });
    });

    afterEach(async () => {
      if (!process.env.DATABASE_URL) return;

      // Clean up in correct order
      await AiInteraction.destroy({ where: { id: testInteractionId } });
      await AiProvider.destroy({ where: { id: testProviderId } });
    });

    it('should handle provider-interaction associations', async () => {
      if (!process.env.DATABASE_URL) return;

      // Test provider → interactions association
      const provider = await AiProvider.findByPk(testProviderId, {
        include: [{ association: 'interactions' }],
      });

      expect(provider).toBeDefined();
      expect((provider as any)?.interactions).toBeInstanceOf(Array);
      expect((provider as any)?.interactions?.length).toBeGreaterThanOrEqual(1);

      // Test interaction → provider association
      const interaction = await AiInteraction.findByPk(testInteractionId, {
        include: [{ association: 'provider' }],
      });

      expect(interaction).toBeDefined();
      expect((interaction as any)?.provider).toBeDefined();
      expect((interaction as any)?.provider?.name).toBe('test-association-provider');
    });
  });
});
