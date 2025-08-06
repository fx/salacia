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

#### Styling Approach

**CRITICAL**: Use WebTUI's built-in styling ONLY - no custom CSS or inline styles:

- **ABSOLUTELY NO Custom CSS**: Never create .css files or add custom styles - WebTUI provides everything needed
- **NO Tailwind**: This project does not use Tailwind CSS classes
- **NO Inline Styles**: Do not use style attributes or custom data attributes for styling
- **WebTUI Is Complete**: WebTUI's design system is comprehensive - if something seems to need custom CSS, you're using WebTUI incorrectly
- **Use Semantic HTML**: Prefer semantic HTML elements (h1-h6, ul, li, strong, small, etc.)
- **WebTUI Utilities**: Use WebTUI's built-in utilities like `box-="square"` for borders
- **NEVER modify padding on WebTUI boxes**: Elements with `box-=` attributes have their own padding - never add custom padding
- **WebTUI Classes**: Use provided classes like `wui-table`, `wui-button`, `wui-input` for components
- **Dialog Elements**: Use native HTML dialog with WebTUI attributes only (position-, container-, size-)

The Catppuccin theme provides all necessary colors, spacing, and typography through WebTUI's CSS.

#### WebTUI ASCII Boxes

Essential box patterns for terminal-style UI:

**Box Types** (must suffix with `-`):
```html
<div box-="square">Square Box</div>
<div box-="round">Round Box</div>
<div box-="double">Double Border</div>
<div box-="double round">Combined styles</div>
```

**Shearing** (overlap edges):
```html
<div box-="square" shear-="top">Top overlap</div>
<div box-="square" shear-="bottom">Bottom overlap</div>
<div box-="square" shear-="both">Both edges</div>
```

**Required Import**: `@import "@webtui/css/utils/box.css";`

### Frontend Architecture

- **React Components**: All interactive UI components should be built with React and TypeScript
- **Astro Integration**: Use Astro's React integration for server-side rendering and hydration
- **Global Styles**: Import WebTUI CSS in global styles file and include in layout components
- **Component Documentation**: All React components must include comprehensive TSDoc documentation