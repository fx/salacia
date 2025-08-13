# Salacia Development Guidelines

**IMPORTANT: DO NOT USE ASCII BOX DRAWING CHARACTERS! WebTUI simulates the terminal look through CSS. Never use characters like └, ─, │, ░, █, etc. Use WebTUI's box attributes and CSS classes instead.**

## Getting Started

### Running the Development Environment

**IMPORTANT**: Always ensure the development environment is running when working on this project:

1. **Check README.md**: First read the full setup instructions in README.md for detailed requirements and configuration
2. **Database Setup**: Start PostgreSQL via Docker Compose (if not already running):
   ```bash
   docker compose up -d
   ```
3. **Development Server**: Run the development server in the background:
   ```bash
   npm run dev
   ```

**For Claude Code**: When starting work on this project:

- Always check if the database is running (`docker compose ps`)
- If database is not running, start it with `docker compose up -d`
- Always run `npm run dev` in the background for live development
- The dev server runs on http://localhost:4321 by default
- **IMPORTANT**: If the server starts on a different port (4322, 4323, etc.), it means multiple servers are running. Kill all dev servers and start fresh:
  ```bash
  # Kill all node processes running Astro dev servers
  pkill -f "astro dev" || killall node
  # Then start a single new dev server
  npm run dev
  ```

### Managing Services

- **Start database**: `docker compose up -d`
- **Stop database**: `docker compose down`
- **View database logs**: `docker compose logs -f postgres`
- **Run migrations**: `npm run sequelize:migrate:up`
- **Development server**: `npm run dev` (run in background)
- **Type checking**: `npm run type-check`
- **Linting**: `npm run lint`
- **Tests**: `npm test`

## Technology Stack

This project uses the following core technologies:

- **PostgreSQL** - Primary database system
- **TypeScript** - 100% TypeScript codebase, no JavaScript
- **Astro** - Web framework for building the application
- **React** - Frontend components and interactivity
- **WebTUI** - Design system and CSS framework
- **Sequelize ORM** - Database ORM and migration management

## Development Standards

### Pull Request Requirements

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

## Code Quality Standards

### Code Commenting Philosophy

Code should speak for itself. Avoid inline comments and explanatory comments within code logic. Well-written, self-documenting code is preferred over commented code.

### TSDoc Documentation Requirements

Every function, class, method, and significant code construct must be documented using TSDoc:

- Document all public APIs thoroughly
- Include parameter descriptions, return types, and examples where helpful
- Follow the TSDoc specification: https://tsdoc.org/

**Note**: Comprehensive documentation is essential for maintainability.

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

**CRITICAL**: Use WebTUI's built-in styling ONLY - no custom CSS or inline styles.

**MANDATORY**: Before adding, modifying, or overriding ANY CSS (especially WebTUI-related), ALWAYS examine `node_modules/@webtui/css/dist/` first. This directory contains all WebTUI CSS sources and must be referenced to maintain tight semantic styling consistency.

- **ABSOLUTELY NO Custom CSS**: Never create custom CSS classes or styles. The ONLY acceptable CSS is:
  - CSS that uses WebTUI's CSS variables (e.g., `var(--foreground1)`)
  - Simple flexbox layout properties for component structure
  - Data attribute selectors that map to dynamic values (e.g., `[data-height="1"]`)
- **NO Tailwind**: This project does not use Tailwind CSS classes
- **NO Inline Styles**: Do not use style attributes - use data attributes instead
- **WebTUI Data Attributes**: Use data attributes like `data-box`, `data-is`, `data-align`, `data-gap`, etc.
- **Reference VerticalBarChart.tsx**: This component is the PERFECT example - it uses ONLY:
  - WebTUI data attributes (`data-box="square"`, `data-is="separator"`, etc.)
  - Simple CSS classes for layout (`chart-row`, `chart-column`)
  - Data attributes for dynamic values (`data-height="5"`)
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

#### WebTUI CSS Architecture

**CSS Layers**: WebTUI uses CSS `@layer` for cascade control:

- `@layer base` - Core variables and resets
- `@layer components` - Component styles (buttons, inputs, tables, etc.)
- `@layer utils` - Utility classes (box borders)

**Semantic Attribute Selectors**:

```css
/* Components use semantic attributes, not classes */
[is-~=button]     /* Button component */
[is-~=separator]  /* Separator line */
[is-~=input]      /* Input field */

/* Size attributes */
[size-=small]     /* Small variant */
[size-=default]   /* Default size */
[size-=large]     /* Large variant */

/* Variant attributes for colors */
[variant-=foreground0]  /* Primary text color */
[variant-=foreground1]  /* Secondary text color */
[variant-=background1]  /* Background variant */

/* Direction and positioning */
[direction-=x]    /* Horizontal */
[direction-=y]    /* Vertical */
[position-=center]  /* Center positioned */
```

**Common CSS Variables**:

```css
/* Colors - defined in @layer base */
--background0, --background1, --background2, --background3
--foreground0, --foreground1, --foreground2

/* Typography */
--font-family, --font-size, --line-height
--font-weight-normal, --font-weight-bold

/* Component-specific */
--box-border-color, --box-border-width
--table-border-color, --separator-color
--button-primary, --button-secondary
```

**Example Patterns**:

```html
<!-- Button with box border -->
<button box-="square" variant-="foreground1">Submit</button>

<!-- Input with size -->
<input type="text" size-="small" />

<!-- Separator with direction -->
<div is-="separator" direction-="horizontal"></div>

<!-- Dialog positioning -->
<dialog position-="center" size-="default" box-="double round"></dialog>

<!-- Table (automatic borders via CSS) -->
<table>
  <!-- WebTUI handles borders via pseudo-elements -->
</table>

<!-- Checkbox and Radio (styled automatically) -->
<input type="checkbox" />
<!-- Shows as [X] when checked -->
<input type="radio" />
<!-- Shows as (*) when checked -->

<!-- Switch variant -->
<input type="checkbox" is-="switch" />
```

**Key Principles**:

1. NEVER override WebTUI component styles directly
2. Use semantic HTML elements - they're automatically styled
3. Use data/attribute selectors, not custom classes
4. Leverage CSS variables for theming consistency
5. Components handle their own spacing via `lh` (line-height) and `ch` (character) units
6. WebTUI handles focus states (underline + bold) automatically

### Frontend Architecture

- **React Components**: All interactive UI components should be built with React and TypeScript
- **Astro Integration**: Use Astro's React integration for server-side rendering and hydration
- **Global Styles**: Import WebTUI CSS in global styles file and include in layout components
- **Component Documentation**: All React components must include comprehensive TSDoc documentation
