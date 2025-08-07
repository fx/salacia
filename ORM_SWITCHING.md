# ORM Switching

This application supports both Drizzle ORM (default) and Sequelize ORM for database operations.

## Environment Variable

Set the `USE_SEQUELIZE` environment variable to control which ORM is used:

- **Default**: Uses Drizzle ORM when `USE_SEQUELIZE` is not set or set to `false`
- **Sequelize**: Uses Sequelize ORM when `USE_SEQUELIZE=true`

## Usage Examples

### Development with Drizzle (Default)

```bash
npm run dev
```

### Development with Sequelize

```bash
USE_SEQUELIZE=true npm run dev
```

### Production with Environment Files

```bash
# .env
USE_SEQUELIZE=true
```

## Affected Endpoints

The following API endpoints support ORM switching:

- `GET /api/messages` - Messages with cursor pagination
- `GET /api/v1/messages/cursor` - V1 cursor pagination endpoint
- `GET /api/messages/[id]` - Individual message retrieval
- `/messages` - Server-side rendered messages page

## Testing

Use the provided test script to verify both modes work:

```bash
# Test with current settings
node test-orm-switch.js

# Test Sequelize mode (if server is running with USE_SEQUELIZE=true)
node test-orm-switch.js
```

## Migration Support

This switching mechanism is designed to support gradual migration from Drizzle to Sequelize:

1. **Phase 1**: Both ORMs available, Drizzle default (current)
2. **Phase 2**: Test Sequelize in development with `USE_SEQUELIZE=true`
3. **Phase 3**: Switch production to Sequelize when ready
4. **Phase 4**: Remove Drizzle code after successful migration
