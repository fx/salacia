# Salacia Development Guidelines

## Technology Stack

This project uses the following core technologies:

- **PostgreSQL** - Primary database system
- **TypeScript** - 100% TypeScript codebase, no JavaScript
- **Astro** - Web framework for building the application
- **React** - Frontend components and interactivity
- **WebTUI** - Design system and CSS framework
- **Drizzle ORM** - Database ORM and migration management

## Development Standards

### Pull Request Size Requirements

We enforce strict pull request size limits to maintain code quality and review effectiveness:

- **Hard limit**: 500 lines maximum of actual code changes
- **Acceptable**: 200 lines or fewer of actual code changes
- **Ideal**: 50 lines or fewer of actual code changes

**Important**: These limits apply to human-written code only. The following do NOT count toward PR size limits:
- Generated files (migrations, lock files, snapshots)
- Configuration files that are mostly boilerplate
- Auto-generated type definitions
- Documentation files when appropriate

**CRITICAL ENFORCEMENT**:
- ALWAYS check PR size with `git diff main --stat` before creating PR
- If approaching 500 lines, STOP immediately and break into smaller PRs
- The pr-reviewer agent MUST check size limits as the FIRST review step
- Size limit violations are BLOCKING issues that override all other concerns
- Any issue or task that would produce a change exceeding these limits must be automatically broken down into smaller tasks, resulting in multiple smaller pull requests

**PR Review Requirements**:
- Every PR MUST be reviewed by the pr-reviewer agent after creation
- All Copilot and automated review comments MUST be addressed
- Continue iterating on feedback until PR is ready for merge
- Do not consider work complete until PR is merged or explicitly blocked

### GitHub Diff Suppression

Configure `.gitattributes` to mark generated files appropriately so they are collapsed by default in GitHub diffs:

```gitattributes
# Mark generated files
migrations/*.sql linguist-generated=true
migrations/meta/*.json linguist-generated=true
*-lock.json linguist-generated=true
*.lock linguist-generated=true
```

This helps reviewers focus on the actual code changes rather than generated artifacts.

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

## UI/UX Standards

### WebTUI Design System

This project uses WebTUI as the primary design system and CSS framework with Catppuccin theming:

- **Documentation**: Always refer to https://webtui.ironclad.sh/start/intro/ for WebTUI documentation
- **Theme**: Uses `@webtui/theme-catppuccin` with `catppuccin-mocha` variant for consistent dark terminal aesthetic
- **Fonts**: Uses `@webtui/plugin-nf` with Hack Nerd Font as primary monospace font family
- **Component Preference**: Always prefer using WebTUI components directly rather than custom implementations
- **Styling Guidelines**: Use WebTUI utilities and data attributes for styling. NO Tailwind CSS classes are used in this project
- **CSS Architecture**: Follow WebTUI's layer-based CSS architecture with `@layer base, utils, components`
- **Design Tokens**: Use WebTUI's design tokens and CSS custom properties for consistent spacing, typography, and colors
- **Data Attributes**: Use semantic data attributes (e.g., `data-nav="terminal"`, `data-panel="header"`) for component styling instead of utility classes

#### CSS Unit Standards

For consistency with terminal-style interfaces, follow these strict unit conventions:

- **Allowed Units**: Use only `ch` (character width) units for sizing in custom CSS
- **Forbidden Units**: Do not use `px`, `em`, `rem`, `%`, `vw`, `vh`, or `lh` in custom CSS
- **Exception**: WebTUI utilities may use other units internally - this restriction applies only to custom CSS

#### CSS Selector Conventions

- **Class Names**: Use WebTUI utility classes exclusively when possible
- **Custom Selectors**: When custom CSS is necessary, use semantic class names that describe function, not appearance
- **Specificity**: Keep specificity low and rely on CSS layer ordering for proper cascade

#### Terminal UI Patterns

- **ASCII Borders**: Use Unicode box-drawing characters (┌─┐│└─┘) for terminal-style borders
- **Monospace Layout**: All text should use monospace fonts for consistent character alignment
- **Color Scheme**: Rely on Catppuccin color palette through WebTUI design tokens
- **Spacing**: Use consistent character-based spacing (multiples of `1ch`) for terminal alignment

### Frontend Architecture

- **React Components**: All interactive UI components should be built with React and TypeScript
- **Astro Integration**: Use Astro's React integration for server-side rendering and hydration
- **Global Styles**: Import WebTUI CSS in global styles file and include in layout components
- **Component Documentation**: All React components must include comprehensive TSDoc documentation