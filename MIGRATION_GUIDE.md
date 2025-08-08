# Database Migration Guide

This project uses Sequelize ORM for all database operations. This guide explains how to manage database migrations and models.

## Current Status

- **Primary ORM**: Sequelize ORM
- **Database**: PostgreSQL
- **Migration System**: Sequelize CLI

## Database Operations

| Command                          | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `npm run sequelize:migrate:up`   | Run pending migrations                       |
| `npm run sequelize:migrate:down` | Rollback the last migration                  |
| `npm run sequelize:seed`         | Run all seeder files                         |
| `npm run sequelize:sync`         | Sync models with database (development only) |

## Migration Strategy

### Development Environment

1. **Create migrations** for all schema changes
2. **Test migrations** in a safe environment first
3. **Use transactions** for complex operations
4. **Document changes** in migration files

### Production Considerations

- **Sequelize**: Mature ecosystem with extensive features
- **Type Safety**: Full TypeScript integration with models
- **Performance**: Optimized query generation and connection pooling
- **Reliability**: Proven in production environments

## Configuration Files

- **Sequelize CLI**: `.sequelizerc`
- **Database Config**: `src/database/sequelize/config.ts`
- **Models**: `src/lib/db/models/`
- **Migrations**: `src/database/migrations/`

## Best Practices

1. **Backup data** before running migrations in production
2. **Test thoroughly** in development environment
3. **Use transactions** for complex migrations
4. **Document changes** in migration files
5. **Version control** all migration files
6. **Review generated SQL** before applying to production
7. **Plan rollback strategy** for each migration
