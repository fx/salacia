# Running Migrations in Production Docker Container

This document explains how to run database migrations in the production Docker container.

## Migration Setup

The production Docker image includes:

- **sequelize-cli**: Available as a production dependency
- **Migration files**: Copied to `/app/migrations/` directory
- **Configuration**: `sequelize-config.cjs` copied to the container root
- **Migration script**: `npm run migrate` command configured

## Running Migrations

### During Deployment

To run migrations during deployment, execute the following command before starting the application:

```bash
docker run --rm \
  -e DATABASE_URL=your_production_database_url \
  -e NODE_ENV=production \
  your-image-name \
  npm run migrate
```

### In Kubernetes/Container Orchestration

Create an init container or job that runs migrations:

```yaml
# Kubernetes Job example
apiVersion: batch/v1
kind: Job
metadata:
  name: salacia-migrations
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: your-salacia-image
          command: ['npm', 'run', 'migrate']
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-secret
                  key: url
            - name: NODE_ENV
              value: 'production'
      restartPolicy: OnFailure
```

### Manual Migration Check

To check migration status:

```bash
docker run --rm \
  -e DATABASE_URL=your_production_database_url \
  -e NODE_ENV=production \
  your-image-name \
  npx sequelize-cli db:migrate:status --config ./sequelize-config.cjs
```

## Environment Variables

Required environment variables for migrations:

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to "production" for production environment

## Migration Files Location

Migration files are located at `/app/migrations/` in the container, copied from `src/lib/db/sequelize-migrations/` in the source.

## Rollback Support

To rollback the last migration:

```bash
docker run --rm \
  -e DATABASE_URL=your_production_database_url \
  -e NODE_ENV=production \
  your-image-name \
  npx sequelize-cli db:migrate:undo --config ./sequelize-config.cjs --migrations-path ./migrations
```
