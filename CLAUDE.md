# Salacia Development Guidelines

## Technology Stack

This project uses the following core technologies:

- **PostgreSQL** - Primary database system
- **TypeScript** - 100% TypeScript codebase, no JavaScript
- **Astro** - Web framework for building the application
- **Drizzle ORM** - Database ORM and migration management

## Development Standards

### Pull Request Size Requirements

We enforce strict pull request size limits to maintain code quality and review effectiveness:

- **Hard limit**: 500 lines maximum
- **Acceptable**: 200 lines or fewer
- **Ideal**: 50 lines or fewer

Any issue or task that would produce a change exceeding these limits must be automatically broken down into smaller tasks, resulting in multiple smaller pull requests.

### Task Breakdown Requirements

For changes that would exceed our PR size limits:

1. Break the work into logical, independent chunks
2. Create separate issues for each chunk
3. Implement each chunk as a separate pull request
4. Ensure each PR can be reviewed and merged independently

## Code Quality Standards

### Code Commenting Philosophy

Code should speak for itself. Avoid inline comments and explanatory comments within code logic. Well-written, self-documenting code is preferred over commented code.

### TSDoc Documentation Requirements

Every function, class, method, and significant code construct must be documented using TSDoc:

- Document all public APIs thoroughly
- Include parameter descriptions, return types, and examples where helpful
- Follow the TSDoc specification: https://tsdoc.org/

**Note**: TSDoc documentation lines are given more leniency when judging pull request size, as comprehensive documentation is essential for maintainability.

### Commit and PR Standards

All commits and pull request titles must follow the Conventional Commits specification:

- Use the format: `type(scope): description`
- Reference: https://www.conventionalcommits.org/en/v1.0.0/
- Examples:
  - `feat(auth): add user authentication system`
  - `fix(database): resolve connection pool timeout issue`
  - `docs(readme): update installation instructions`