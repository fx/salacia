# Salacia

An LLM inference API proxy with database recording capabilities built with Astro, TypeScript, PostgreSQL, and Drizzle ORM.

## 🚀 Features

- **TypeScript-first**: 100% TypeScript codebase with strict type checking
- **Modern Database Stack**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Health Monitoring**: Built-in health check API with database connectivity testing
- **Development Ready**: Docker Compose for PostgreSQL, ESLint, Prettier, and comprehensive scripts
- **Production Ready**: Server-side rendering with Node.js adapter for deployment

## 📋 Prerequisites

- Node.js 20+ 
- Docker and Docker Compose (for PostgreSQL)
- npm or yarn

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd salacia
npm install
```

### 2. Environment Setup

Copy the environment variables:

```bash
cp .env.example .env
```

The default configuration uses:
- Database: `postgresql://salacia:salacia_dev_password@localhost:5432/salacia`
- Port: `4321`
- Node Environment: `development`

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

Wait for PostgreSQL to be ready (check with `docker compose logs postgres`).

### 4. Run Database Migrations

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:4321 to see your application.

### 6. Test Health Check

Visit http://localhost:4321/api/health to verify database connectivity.

## 📁 Project Structure

```
salacia/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── connection.ts    # Database connection utilities
│   │   │   ├── schema.ts        # Database schema definitions
│   │   │   └── index.ts         # Database module exports
│   │   └── env.ts               # Environment variable validation
│   └── pages/
│       ├── api/
│       │   └── health.ts        # Health check endpoint
│       └── index.astro          # Homepage
├── migrations/                  # Database migration files
├── docker-compose.yml          # PostgreSQL container setup
├── drizzle.config.ts           # Drizzle ORM configuration
├── eslint.config.js            # ESLint configuration
├── .prettierrc                 # Prettier configuration
└── package.json                # Dependencies and scripts
```

## 🧞 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run format` | Format code with Prettier |
| `npm run db:generate` | Generate database migration files |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |

## 🐳 Docker Commands

| Command | Action |
|---------|--------|
| `docker compose up -d postgres` | Start PostgreSQL in background |
| `docker compose down` | Stop all services |
| `docker compose logs postgres` | View PostgreSQL logs |
| `docker compose exec postgres psql -U salacia -d salacia` | Connect to PostgreSQL CLI |

## 🔧 Database Management

### Creating Migrations

After modifying the schema in `src/lib/db/schema.ts`:

```bash
npm run db:generate
npm run db:migrate
```

### Database Studio

Access the visual database editor:

```bash
npm run db:studio
```

### Direct Database Access

```bash
docker compose exec postgres psql -U salacia -d salacia
```

## 🏥 Health Monitoring

The health check endpoint (`/api/health`) provides:
- Overall system status
- Database connectivity status
- Response time metrics
- Detailed service information

Example response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "responseTime": 45,
  "services": {
    "database": "healthy"
  },
  "details": {
    "database": {
      "connected": true,
      "responseTime": 12
    }
  }
}
```

## 📝 Development Guidelines

### Code Quality

- All code must pass TypeScript strict mode compilation
- ESLint and Prettier are enforced
- TSDoc comments required for all public functions and classes
- Follow Conventional Commits specification for commit messages

### Database Schema

- Use Drizzle ORM for all database operations
- Generate migrations for schema changes
- Include proper TSDoc documentation for schema definitions

### Environment Variables

- All environment variables are validated using Zod
- Add new variables to both `src/lib/env.ts` and `.env.example`

#### Logging Configuration

Control application logging verbosity using the `LOG_LEVEL` environment variable:

- **`LOG_LEVEL`**: Set to `error`, `warn`, `info`, or `debug`
  - Default: `info` in production, `debug` in development
  - Example: `LOG_LEVEL=warn npm run dev`
- **`NODE_ENV`**: Set to `test` to suppress most logs during testing
  - Example: `NODE_ENV=test npm test`

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run preview
```

The application builds to a standalone Node.js server in the `dist/` directory.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/new-feature`
3. Make your changes following the development guidelines
4. Run tests: `npm run type-check && npm run lint`
5. Commit using conventional commits: `git commit -m "feat: add new feature"`
6. Push and create a pull request

## 🔗 Technologies

- [Astro](https://astro.build) - Web framework
- [TypeScript](https://typescriptlang.org) - Language
- [PostgreSQL](https://postgresql.org) - Database  
- [Drizzle ORM](https://orm.drizzle.team) - Database ORM
- [Docker](https://docker.com) - Containerization 
- [Zod](https://zod.dev) - Schema validation