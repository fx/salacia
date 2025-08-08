# Sequelize ORM Implementation

## Overview

This document describes the Sequelize ORM implementation in the Salacia application. Sequelize is now the sole ORM used for all database operations.

## Key Features

### 1. Sequelize Model System

Complete model definitions for all database entities:

- **SystemMetadata**: System configuration storage
- **ApiRequest**: HTTP request logging
- **HealthCheck**: System health monitoring
- **AiProvider**: AI provider configurations
- **AiInteraction**: AI API interaction tracking

### 2. Automatic Hooks System

Sequelize hooks provide automatic tracking of message updates:

```typescript
// Example: AiInteraction model with hooks
AiInteraction.init(
  {
    // ... model attributes
  },
  {
    hooks: {
      beforeUpdate: instance => {
        console.log('AI interaction being updated:', instance.id);
      },
      afterUpdate: instance => {
        console.log('AI interaction updated:', instance.id);
      },
    },
  }
);
```

### 3. Relationship Management

Models support complex relationships:

```typescript
// Define associations
AiProvider.hasMany(AiInteraction, {
  foreignKey: 'providerId',
  as: 'interactions',
});

AiInteraction.belongsTo(AiProvider, {
  foreignKey: 'providerId',
  as: 'provider',
});
```

## Basic Usage

### Creating Records

```typescript
import { AiInteraction } from '@/lib/db/models';

// Create new AI interaction
const interaction = await AiInteraction.create({
  model: 'gpt-4',
  request: { prompt: 'Hello' },
  response: { completion: 'Hi there!' },
  totalTokens: 10,
  responseTimeMs: 250,
});
```

### Querying Data

```typescript
// Find with conditions
const interactions = await AiInteraction.findAll({
  where: {
    model: 'gpt-4',
    error: null,
  },
  order: [['createdAt', 'DESC']],
  limit: 10,
});
```

### Using Associations

```typescript
// Find with related data
const providers = await AiProvider.findAll({
  include: [
    {
      model: AiInteraction,
      as: 'interactions',
      where: { error: null },
    },
  ],
});

// Load interaction with provider
const interaction = await AiInteraction.findByPk(interactionId, {
  include: [{ association: 'provider' }],
});
```

## Configuration

### Database Connection

Sequelize connects to PostgreSQL using environment variables:

```typescript
// src/database/sequelize/config.ts
export default {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
```

### Model Registration

Models are automatically loaded and registered:

```typescript
// src/lib/db/models/index.ts
import { sequelize } from '@/database/sequelize';
import { AiInteraction } from './ai-interaction';
import { AiProvider } from './ai-provider';

// Initialize models
const models = {
  AiInteraction,
  AiProvider,
  // ... other models
};

// Setup associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});
```

## Testing

### Running Tests

```bash
# Run all Sequelize integration tests
npm test sequelize-integration

# Run specific test categories
npm test -- --grep "Sequelize Integration"
npm test -- --grep "Service Layer Integration"
```

### Validation Checklist

- [ ] Database connection establishes successfully
- [ ] All CRUD operations work on all models
- [ ] Hooks are triggered on model updates
- [ ] Service layer returns correct data formats
- [ ] API endpoints function correctly
- [ ] Statistics and aggregation queries work
- [ ] Error handling behaves consistently

## Performance Considerations

- Query performance is optimized through proper indexing
- Connection pooling reduces database connection overhead
- Cursor pagination improves large dataset handling
- Hooks add minimal overhead (~1-2ms per operation)

## Schema Management

### Creating New Models

1. Define model in `src/lib/db/models/`
2. Create migration for table structure
3. Run migration to create table
4. Add associations if needed

### Modifying Existing Models

1. Update model definition
2. Create migration for changes
3. Test migration locally
4. Apply to production after testing

## Best Practices

1. **Use TypeScript** for all model definitions
2. **Include TSDoc** documentation for all models and methods
3. **Test migrations** thoroughly before production
4. **Use transactions** for data integrity
5. **Monitor performance** of complex queries
6. **Implement proper error handling** in all database operations

## Common Patterns

### Pagination

```typescript
const { rows, count } = await AiInteraction.findAndCountAll({
  limit: 20,
  offset: 40,
  order: [['createdAt', 'DESC']],
});
```

### Bulk Operations

```typescript
// Bulk create
await AiInteraction.bulkCreate(interactions);

// Bulk update
await AiInteraction.update({ status: 'processed' }, { where: { status: 'pending' } });
```

### Transactions

```typescript
const transaction = await sequelize.transaction();

try {
  await AiProvider.create(providerData, { transaction });
  await AiInteraction.create(interactionData, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```
