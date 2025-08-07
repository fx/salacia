# ORM Migration Guide

This project supports both Drizzle ORM and Sequelize ORM. This guide explains how to switch between them and manage database migrations.

## Current Status

- **Primary ORM**: Drizzle ORM (default)
- **Secondary ORM**: Sequelize (optional)
- **Switch Control**: `USE_SEQUELIZE` environment variable

## Switching Between ORMs

### Using Drizzle ORM (Default)

1. Set environment variable:

   ```bash
   USE_SEQUELIZE=false
   ```

2. Use Drizzle commands:
   ```bash
   npm run db:generate    # Generate migrations
   npm run db:migrate     # Run migrations
   npm run db:push        # Push schema changes
   npm run db:studio      # Open database studio
   ```

### Using Sequelize ORM

1. Set environment variable:

   ```bash
   USE_SEQUELIZE=true
   ```

2. Use Sequelize commands:
   ```bash
   npm run sequelize:migrate:up    # Run migrations
   npm run sequelize:migrate:down  # Rollback last migration
   npm run sequelize:seed          # Run all seeders
   npm run sequelize:sync          # Sync models with database
   ```

## Database Operations

### Drizzle Commands

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `npm run db:generate` | Generate migration files from schema |
| `npm run db:migrate`  | Apply pending migrations             |
| `npm run db:push`     | Push schema changes directly         |
| `npm run db:studio`   | Launch Drizzle Studio web interface  |

### Sequelize Commands

| Command                          | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `npm run sequelize:migrate:up`   | Run pending migrations                       |
| `npm run sequelize:migrate:down` | Rollback the last migration                  |
| `npm run sequelize:seed`         | Run all seeder files                         |
| `npm run sequelize:sync`         | Sync models with database (development only) |

## Migration Strategy

### Development Environment

1. **Choose your ORM** based on project requirements
2. **Use consistent tooling** throughout development
3. **Test migrations** in a safe environment first

### Production Considerations

- **Drizzle**: More type-safe, better TypeScript integration
- **Sequelize**: More mature ecosystem, extensive feature set
- **Migration Path**: Consider data compatibility when switching

## Configuration Files

- **Drizzle**: `drizzle.config.ts`
- **Sequelize**: `.sequelizerc`, `src/database/sequelize/config.ts`
- **Environment**: `.env` (USE_SEQUELIZE variable)

## Best Practices

1. **Backup data** before switching ORMs
2. **Test thoroughly** in development environment
3. **Use transactions** for complex migrations
4. **Document changes** in migration files
5. **Version control** all migration files
