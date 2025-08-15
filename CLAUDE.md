# Salacia Development Guidelines

**IMPORTANT: DO NOT USE ASCII BOX DRAWING CHARACTERS! WebTUI simulates the terminal look through CSS. Never use characters like └, ─, │, ░, █, etc. Use WebTUI's box attributes and CSS classes instead.**

**Note: This file (CLAUDE.md) is the single source of truth for all AI development instructions. The following files symlink to this document:**

- `docs/AGENTS.md` - OpenCode agent instructions
- `.github/copilot-instructions.md` - GitHub Copilot instructions

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
- **IMPORTANT**: The Astro dev server doesn't handle hot reload very well. Always restart it after completing a task:
  ```bash
  # Kill the existing dev server
  pkill -f "astro dev" || killall node
  # Start a fresh dev server in the background
  npm run dev
  ```
- **IMPORTANT**: If the server starts on a different port (4322, 4323, etc.), it means multiple servers are running. Kill all dev servers and start fresh as shown above

### Managing Services

- **Start database**: `docker compose up -d`
- **Stop database**: `docker compose down`
- **View database logs**: `docker compose logs -f postgres`
- **Run migrations**: `npm run sequelize:migrate:up` (see [docs/MIGRATIONS.md](docs/MIGRATIONS.md))
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
- **Vercel AI SDK** - For broad AI provider support (OpenAI, Anthropic, Groq, etc.)

### AI Provider Implementation Strategy

**IMPORTANT**: While we use Vercel's AI SDK for broad provider support, some providers require custom implementations:

- **Use Vercel AI SDK** for standard API key-based providers (OpenAI, Groq, standard Anthropic)
- **Bypass Vercel AI SDK** when a provider requires specific authentication or request formatting:
  - OAuth-based authentication (e.g., Claude Max OAuth)
  - Custom header requirements
  - Non-standard API behaviors

**Example**: OAuth Anthropic implementation bypasses the SDK entirely to:

1. Control exact headers sent (user-agent, beta flags, etc.)
2. Inject system prompts
3. Handle OAuth Bearer tokens properly
4. Make direct API calls without SDK interference

See `src/lib/ai/providers/anthropic/client.ts` for the custom implementation pattern.

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

**MANDATORY BEFORE ANY CSS CHANGES**:

1. **ALWAYS** examine `node_modules/@webtui/css/dist/` FIRST to understand:
   - Which `@layer` the component belongs to (base, components, utils)
   - Existing CSS selectors and properties
   - CSS variables being used
   - How the component is structured
2. For example, before modifying tables, check `node_modules/@webtui/css/dist/components/table.css`
3. Match the EXACT layer when extending/overriding (e.g., table styles go in `@layer components`)
4. This directory contains ALL WebTUI CSS sources and MUST be referenced to maintain consistency

- **ABSOLUTELY NO Custom CSS**: Never create custom CSS classes or styles. The ONLY acceptable CSS is:
  - CSS that uses WebTUI's CSS variables (e.g., `var(--foreground1)`)
  - Simple flexbox layout properties for component structure
  - Data attribute selectors that map to dynamic values (e.g., `[data-height="1"]`)
- **NO Tailwind**: This project does not use Tailwind CSS classes
- **NO Inline Styles**: Do not use style attributes - use data attributes instead
- **WebTUI Data Attributes**: Use data attributes like `data-box`, `data-is`, `data-align`, `data-gap`, etc.
- **Compact Variants**: Use `size-="compact"` for compact tables and buttons to match the CSS selectors in global.css
- **Reference VerticalBarChart.tsx**: This component is the PERFECT example - it uses ONLY:
  - WebTUI data attributes (`data-box="square"`, `data-is="separator"`, etc.)
  - Simple CSS classes for layout (`chart-row`, `chart-column`)
  - Data attributes for dynamic values (`data-height="5"`)
- **Use Semantic HTML**: Prefer semantic HTML elements (h1-h6, ul, li, strong, small, etc.)
- **WebTUI Utilities**: Use WebTUI's built-in utilities like `box-="square"` for borders
- **CRITICAL ATTRIBUTE SYNTAX**: WebTUI attributes that end with `-=` (like `box-=`, `shear-=`, `position-=`, `is-=`, `variant-=`, `size-=`) MUST KEEP THE DASH. This is the CORRECT WebTUI syntax!
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
[size-=compact]   /* Compact variant - minimal padding/spacing */

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

#### WebTUI Table Border Shear Issue

**CRITICAL UNDERSTANDING**: WebTUI table borders are positioned INSIDE the table content area, not outside:

```css
/* WebTUI positions table border at: */
top: calc(0.5lh - (var(--table-border-width) / 2));
/* This places the border 0.5lh from the top, OVERLAPPING with content */
```

**The Shear Problem**:

- Without padding, table rows will "shear" into (overlap with) the border
- The top border starts at 0.5lh, the bottom border ends at 0.5lh from bottom
- Normal tables have `padding-top: 1lh` on first row to avoid this
- Compact tables remove this padding, causing intentional top shear

**Compact Table Design**:

- **Top row**: SHOULD shear into border (intentional compact look)
- **Bottom row**: MUST have padding-bottom to prevent shear
- **Solution**: Add `padding-bottom: 0.5lh` to last row only
- **Also**: Add `margin-bottom: 1lh` to table for spacing from next content

### Frontend Architecture

- **React Components**: All interactive UI components should be built with React and TypeScript
- **Astro Integration**: Use Astro's React integration for server-side rendering and hydration
- **Global Styles**: Import WebTUI CSS in global styles file and include in layout components
- **Component Documentation**: All React components must include comprehensive TSDoc documentation

## Code Review Guidelines for GitHub Copilot

### WebTUI Table Border Behavior

- Do not flag `padding-top: 0` on table rows as incorrect - this is intentional shearing for compact table design
- WebTUI table borders are positioned at 0.5lh from edges, overlapping with content when padding is removed
- Compact tables intentionally allow first row to shear into top border for dense layouts

### WebTUI CSS Implementation Patterns

- Setting `padding-top: 0` DOES cause shearing when WebTUI borders are positioned inside content area
- This is an intentional design pattern for compact UI components
- WebTUI uses semantic attributes (is-, variant-, size-) not custom classes

### UI/UX Design Decisions

- WebTUI confirmation dialogs and inline messaging components are preferred over browser `confirm()` and `alert()`
- WebTUI error boxes using `data-variant="red"` are used for inline error display
- UI-level validation (disabled buttons) prevents business rule violations, making server-side checks optional
- Delete actions that remove resources should return HTTP 204 (No Content) for successful operations

### Data Model and API Patterns

- Provider models field should store data directly as arrays, not wrapped in objects (e.g., `models: string[]` not `models: { models: string[] }`)
- Global CSS imports should be handled at layout level, not in individual page components
- API response structures should be consistent - test endpoints return `{ success: boolean, data: TestResult }` where TestResult also has success field
- WebTUI attribute syntax requires proper naming: `data-variant` not `data-variant-`, `is` not `is-`

### Test Infrastructure and Global Setup

- `globalThis.TestUtils.mockServer` is properly configured in `src/test/setup.ts` - do not flag as missing
- Test files can safely access `globalThis.TestUtils` for MSW mock server functionality
- The TestUtils global is initialized during test setup and is available throughout test execution

### API Response Structure Guidelines

**CRITICAL: Provider API endpoints return data directly without wrapper objects:**

- **Provider list endpoints** (GET /api/providers): Return `Provider[]` directly, NOT wrapped in success/data objects
- **Single provider endpoints** (GET /api/providers/:id): Return `Provider` directly, NOT wrapped in success/data objects
- **Create provider endpoints** (POST /api/providers): Return `Provider` directly, NOT wrapped in success/data objects
- **Update provider endpoints** (PUT /api/providers/:id): Return `Provider` directly, NOT wrapped in success/data objects
- **Delete provider endpoints** (DELETE /api/providers/:id): Return HTTP 204 No Content with empty body
- **Test endpoints specifically** (POST /api/providers/:id/test): Return `{ success: true, data: { success: boolean, error?: string } }`

**Error responses only** use wrapper format: `{ success: false, error: string }`

**HTTP Status Code Guidelines:**

- Use 422 Unprocessable Entity for validation errors (not 400)
- Use 400 Bad Request only for malformed JSON/syntax errors
- Use 500 Internal Server Error for unexpected server errors

**Frontend Response Handling:**

- Check `response.ok` instead of `result.success` when provider endpoints return data directly
- Only parse JSON for error responses when `!response.ok`

**Validation schemas for provider endpoints:**

- `updateProviderSchema.baseUrl` must be marked as `.optional()` to prevent unintended overwrites during updates
- `baseUrlSchema` already handles empty string transformation to undefined - do not flag this as incorrect

### Error Handling Patterns

- ProviderManager.testProvider already returns proper `{ success: boolean, error?: string }` format
- ProviderService methods have comprehensive try-catch error handling - do not suggest additional validation
- Service methods that call ProviderManager methods can trust the return format consistency
- Do not suggest redundant try-catch blocks around ProviderManager calls that already handle errors
- API test endpoints should return the test result directly without wrapping in additional success/data objects

### WebTUI Attribute Syntax Guidelines

- Use `size-="compact"` for compact styling, not `data-compact="true"` - the CSS selectors target `[size-="compact"]`
- Compact variants should use the size- attribute format for consistency with WebTUI semantic attributes
- Compact tables and buttons require the size-="compact" attribute to apply minimal padding and spacing

### Critical WebTUI Attribute Naming Patterns

**CRITICAL: WebTUI has TWO types of attributes:**

1. **Attributes WITH trailing dash** (KEEP THE DASH - these are CORRECT):
   - `box-="square"` ✅ CORRECT
   - `shear-="top"` ✅ CORRECT
   - `position-="center"` ✅ CORRECT
   - `is-="button"` ✅ CORRECT
   - `variant-="red"` ✅ CORRECT
   - `size-="compact"` ✅ CORRECT

2. **Data attributes WITHOUT trailing dash** (used for custom/dynamic values):
   - `data-variant="red"` ✅ CORRECT for custom variants
   - `data-box="square"` ✅ CORRECT for custom box styles
   - `data-height="5"` ✅ CORRECT for dynamic values

**DO NOT CONFUSE THESE! The `-=` syntax is INTENTIONAL and REQUIRED for WebTUI semantic attributes.**

### TypeScript Type Safety Guidelines

- **NEVER use `as any`** in service layers or database operations
- For Sequelize operations, use proper type assertions with model creation attributes:
  - **CORRECT**: `await AiProviderModel.create(validatedData as AiProviderCreationAttributes)`
  - **WRONG**: `await AiProviderModel.create(validatedData as any)`
- Define proper interfaces for complex data transformations instead of bypassing type checking
- Service layer methods should maintain type safety throughout the call chain

### Browser API Usage Restrictions

- **NEVER use browser `alert()`, `confirm()`, or `prompt()`** - they break WebTUI design consistency
- **Use WebTUI components instead:**
  - Confirmation dialogs: Use HTML `<dialog>` with WebTUI attributes
  - Error display: Use `<div data-box="square" variant="red">`
  - Success messages: Use `<div data-box="square" variant="green">`
  - Status badges: Use `<span is="badge" variant="blue">`

### API Validation Schema Consistency

- **baseUrl validation must be consistent** across create/update schemas:
  - Define shared `baseUrlSchema` once
  - Reuse in both `createProviderSchema` and `updateProviderSchema`
  - Use `.optional()` for update schemas to prevent unintended overwrites
- **Empty string handling**: Transform empty strings to `undefined` for optional fields
- **URL validation**: Use `z.string().url().optional()` not mixed approaches

### API Endpoint Naming Consistency

- **API endpoint paths must match test expectations:**
  - File: `src/pages/api/providers/[id]/default.ts` (NOT `set-default.ts`)
  - Route: `POST /api/providers/:id/default` (NOT `/set-default`)
  - Test files expect `/default` endpoint - do not suggest changing to `/set-default`

### Astro Page Redirect Best Practices

- **Use `Astro.redirect()` for page redirects, not manual Response objects:**
  - **CORRECT**: `return Astro.redirect('/settings/providers')`
  - **WRONG**: `return new Response(null, { status: 302, headers: { Location: '/settings/providers' } })`
- Astro.redirect() handles edge cases and headers properly

### Service Layer Error Handling

- **ProviderManager methods already have comprehensive error handling** - do not suggest additional try-catch
- **Service methods that wrap ProviderManager calls can trust the return format**
- **API test endpoints should pass through test results directly** without additional wrapping
- Service layer should focus on business logic, not redundant error wrapping

### OAuth Implementation Review Guidelines

- **OAuth API response structure**: ProviderForm correctly checks for `result.data.authorizationUrl` - this matches the actual API response structure
- **Property name consistency**: Do not flag correct property names as mismatches without verifying the actual API response format
- **OAuth flow validation**: The OAuth initialization flow uses the correct property names throughout the codebase

## Testing Best Practices

### React Testing Library Principles

**Core Philosophy**: Test user behavior, not implementation details.

**Query Priority** (in order of preference):

1. `getByRole` - Queries by accessibility role
2. `getByLabelText` - For form fields
3. `getByPlaceholderText` - When label isn't available
4. `getByText` - For non-interactive elements
5. `getByDisplayValue` - For form element values

**Anti-patterns to AVOID**:

- `container.querySelector('.class-name')` - Tests implementation, not behavior
- Testing CSS classes directly - Classes can change without breaking functionality
- `getByTestId` - Only use as last resort
- Testing component internals/state - Focus on outputs users see

**Best Practices**:

- Use `screen` queries instead of destructuring from `render()`
- Use `@testing-library/user-event` over `fireEvent` for realistic interactions
- Query elements how users perceive them (visible text, labels, roles)
- Write tests that give confidence the app works for real users

## Documentation Reference

For detailed documentation on specific topics:

- **[docs/MIGRATIONS.md](docs/MIGRATIONS.md)** - Complete database migration guide (Sequelize, Docker, production deployment)
- **[docs/PROVIDER_CONFIGURATION.md](docs/PROVIDER_CONFIGURATION.md)** - AI provider setup and configuration
- **[docs/AGENTS.md](docs/AGENTS.md)** - Development workflow agents and automation
- **[README.md](README.md)** - Project setup and installation instructions
