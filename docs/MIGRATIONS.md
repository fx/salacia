# Database Migrations Guide

This comprehensive guide covers all aspects of database migrations in the Salacia application, including Sequelize ORM usage, migration commands, and Docker deployment.

## Table of Contents

1. [Overview](#overview)
2. [Sequelize Commands](#sequelize-commands)
3. [Creating Migrations](#creating-migrations)
4. [Running Migrations](#running-migrations)
5. [Docker Production Migrations](#docker-production-migrations)
6. [Model Definitions](#model-definitions)
7. [Best Practices](#best-practices)

## Overview

- **ORM**: Sequelize ORM
- **Database**: PostgreSQL
- **Migration Tool**: Sequelize CLI
- **Migration Location**: `src/lib/db/sequelize-migrations/`

## Sequelize Commands

| Command                          | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `npm run sequelize:migrate:up`   | Run pending migrations                       |
| `npm run sequelize:migrate:down` | Rollback the last migration                  |
| `npm run sequelize:seed`         | Run all seeder files                         |
| `npm run sequelize:sync`         | Sync models with database (development only) |
| `npm run migrate`                | Run migrations in production                 |

## Creating Migrations

### Generate a New Migration

```bash
npx sequelize-cli migration:generate --name add-new-feature
```

This creates a new file in `src/lib/db/sequelize-migrations/` with timestamp.

### Migration File Structure

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Migration logic here
    await queryInterface.createTable('TableName', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // ... other columns
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback logic here
    await queryInterface.dropTable('TableName');
  },
};
```

## Running Migrations

### Development Environment

1. Ensure PostgreSQL is running:

   ```bash
   docker compose up -d
   ```

2. Run pending migrations:

   ```bash
   npm run sequelize:migrate:up
   ```

3. Rollback last migration (if needed):
   ```bash
   npm run sequelize:migrate:down
   ```

### Testing Migrations

```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Run specific migration
npx sequelize-cli db:migrate --to 20250809051256-initial-schema.cjs
```

## Docker Production Migrations

The production Docker image includes all necessary components for running migrations:

### Image Contents

- **sequelize-cli**: Available as a production dependency
- **Migration files**: Copied to `/app/migrations/` directory
- **Configuration**: `sequelize-config.cjs` at container root
- **Migration script**: `npm run migrate` command

### Running Migrations in Production

#### During Deployment

```bash
# Run migrations before starting the application
docker run --rm \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e NODE_ENV=production \
  your-image-name \
  npm run migrate
```

#### Using Docker Compose

```yaml
version: '3.8'
services:
  migrate:
    image: your-image-name
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/db
      NODE_ENV: production
    command: npm run migrate
    depends_on:
      - postgres

  app:
    image: your-image-name
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/db
      NODE_ENV: production
    depends_on:
      migrate:
        condition: service_completed_successfully
```

#### In Kubernetes

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-migration
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: your-image-name
          command: ['npm', 'run', 'migrate']
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
            - name: NODE_ENV
              value: 'production'
      restartPolicy: Never
```

#### Manual Migration in Running Container

```bash
# Execute migration in a running container
docker exec -it container-name npm run migrate

# Or using docker-compose
docker-compose exec app npm run migrate
```

## Model Definitions

Sequelize models are defined in `src/lib/db/models/`:

### Core Models

- **SystemMetadata**: System configuration and metadata storage
- **ApiRequest**: HTTP request logging and analytics
- **HealthCheck**: System health status monitoring
- **AiProvider**: AI provider configurations (OpenAI, Anthropic, etc.)
- **AiInteraction**: AI API interaction tracking and logging

### Model Features

#### Automatic Hooks

All models include automatic hooks for data management:

```javascript
// Example: AiProvider model hooks
hooks: {
  beforeValidate: (provider) => {
    // Auto-generate slug from name
    if (provider.name && !provider.slug) {
      provider.slug = provider.name.toLowerCase().replace(/\s+/g, '-');
    }
  },
  beforeSave: (provider) => {
    // Ensure required fields
    provider.isActive = provider.isActive ?? true;
  }
}
```

#### Type Safety

All models use TypeScript for complete type safety:

```typescript
interface AiProviderAttributes {
  id: number;
  name: string;
  slug: string;
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  // ... other fields
}
```

## Best Practices

### Migration Guidelines

1. **Always test migrations locally** before deploying to production
2. **Keep migrations atomic** - one logical change per migration
3. **Include rollback logic** in the `down` method
4. **Never modify existing migrations** after deployment
5. **Use transactions** for multi-table changes:

```javascript
async up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.addColumn('table1', 'column1', {...}, { transaction });
    await queryInterface.addColumn('table2', 'column2', {...}, { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### Production Deployment Checklist

- [ ] Test migration locally
- [ ] Review migration SQL with team
- [ ] Backup production database
- [ ] Run migration in staging environment
- [ ] Schedule maintenance window if needed
- [ ] Deploy migration to production
- [ ] Verify migration success
- [ ] Monitor application health

### Troubleshooting

#### Common Issues

1. **Migration fails with "relation already exists"**
   - Check if migration was partially applied
   - Review `SequelizeMeta` table for migration status

2. **Cannot connect to database in Docker**
   - Verify `DATABASE_URL` environment variable
   - Ensure database container is running
   - Check network connectivity between containers

3. **Migration runs but changes don't appear**
   - Verify correct database/schema
   - Check for transaction rollbacks
   - Review migration logs for errors

#### Debug Commands

```bash
# Check current migration status
npx sequelize-cli db:migrate:status

# View migration SQL without executing
npx sequelize-cli db:migrate --dry-run

# Connect to database directly
docker exec -it postgres-container psql -U user -d database
```

## Related Documentation

- [Provider Configuration Guide](./PROVIDER_CONFIGURATION.md) - AI provider setup
- [Development Setup](../README.md) - Local development environment
- [Docker Deployment](../Dockerfile) - Container configuration
