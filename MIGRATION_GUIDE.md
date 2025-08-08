# Sequelize ORM Migration Guide

This project uses Sequelize ORM for all database operations. This guide explains how to work with Sequelize and manage database migrations.

## Overview

- **ORM**: Sequelize ORM
- **Database**: PostgreSQL
- **Migration Tool**: Sequelize CLI

## Database Operations

### Sequelize Commands

| Command                          | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `npm run sequelize:migrate:up`   | Run pending migrations                       |
| `npm run sequelize:migrate:down` | Rollback the last migration                  |
| `npm run sequelize:seed`         | Run all seeder files                         |
| `npm run sequelize:sync`         | Sync models with database (development only) |

## Migration Strategy

### Development Environment

1. **Create migrations** for schema changes
2. **Test migrations** in a safe environment first
3. **Use transactions** for complex migrations

### Production Considerations

- **Always backup** database before migrations
- **Test thoroughly** in staging environment
- **Monitor** application after migrations

## Configuration Files

- **Sequelize Config**: `.sequelizerc`, `src/database/sequelize/config.ts`
- **Models**: `src/lib/db/models/`
- **Migrations**: `src/database/migrations/`

## Best Practices

1. **Version control** all migration files
2. **Document changes** in migration files
3. **Use transactions** for data integrity
4. **Test rollback** procedures
5. **Monitor performance** after migrations

## Creating New Migrations

```bash
# Generate a new migration
npx sequelize-cli migration:generate --name add-new-feature

# Run the migration
npm run sequelize:migrate:up

# Rollback if needed
npm run sequelize:migrate:down
```

## Model Management

Models are defined in `src/lib/db/models/` and follow Sequelize conventions:

- Each model is a separate file
- Models define table structure and relationships
- Use TypeScript for type safety
- Include comprehensive TSDoc documentation

## Common Operations

### Adding a New Model

1. Create model file in `src/lib/db/models/`
2. Define model attributes and options
3. Create migration for the table
4. Run migration to create table

### Modifying Existing Tables

1. Create migration file
2. Define up() and down() methods
3. Test migration locally
4. Apply to production after testing

### Data Seeding

1. Create seeder files for initial data
2. Run seeders with `npm run sequelize:seed`
3. Use seeders for development/test data

## Troubleshooting

### Migration Failures

- Check migration syntax
- Verify database connectivity
- Review error logs
- Test in development first

### Rollback Procedures

- Use `npm run sequelize:migrate:down` for single rollback
- Multiple rollbacks: specify migration name
- Always test rollback procedures

### Performance Issues

- Monitor query performance
- Use indexes appropriately
- Optimize model associations
- Consider query caching
