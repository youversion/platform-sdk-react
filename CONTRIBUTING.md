# Contributing to YouVersion Platform React SDKs

This project is maintained and developed by the YouVersion team.

## Development & Testing

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0 (required for workspace management)

> **⚠️ pnpm Required:** This monorepo uses pnpm workspaces for development. While individual packages work with npm/yarn when installed via npm registry, local development requires **pnpm >= 9.0.0**. Verify with `pnpm --version`.

### Setup

```bash
# Clone the repository
git clone https://github.com/youversion/platform-sdk-react.git
cd platform-sdk-react

# Install dependencies
pnpm install
```

### Build Commands

```bash
# Build all packages in dependency order
pnpm build

# Build specific packages
pnpm build:core    # Build core
pnpm build:react   # Build React SDK (hooks + ui)
```

### Test Commands

```bash
# Run all tests (sequential execution for clear output)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for specific packages
pnpm --filter @youversion/platform-core test
pnpm --filter @youversion/platform-react-hooks test
pnpm --filter @youversion/platform-react-ui test

# Run tests with coverage
pnpm --filter @youversion/platform-core test:coverage
pnpm --filter @youversion/platform-react-hooks test:coverage
pnpm --filter @youversion/platform-react-ui test:coverage
```

### Type Checking

```bash
# Type check all packages
pnpm typecheck
```

### Linting and Formatting

```bash
# Run ESLint
pnpm lint

# Format code with Prettier
pnpm format
```

### Development Environment

```bash
# Run the example app with watch mode
pnpm dev:web
```

The development script automatically:
- Builds and watches SDK packages for changes
- Starts the Next.js example app
- Manages dependencies with Turbo for optimal performance

### Storybook Development (UI Package)

```bash
# Start Storybook development server
pnpm --filter @youversion/platform-react-ui storybook

# Build Storybook for deployment
pnpm --filter @youversion/platform-react-ui build-storybook
```

**Storybook Setup:**
1. Create `.env.local` in `packages/ui/`
2. Add `STORYBOOK_YOUVERSION_APP_KEY="your-app-key"`
3. Run `pnpm --filter @youversion/platform-react-ui storybook`

### Development Guidelines

**Important Rules:**

- ✅ Every PR must pass `pnpm build` (includes type definitions and linting)
- ✅ Always use package imports (e.g., `@youversion/platform-core`), never deep imports
- ✅ Keep exports organized behind barrels (index files)
- ✅ If you add new exports, update the package's "exports" map in package.json
- ✅ Mark internal/private APIs with `/** @internal */` JSDoc comments to exclude them from public .d.ts files
- ✅ Respect package boundaries: `ui` can use `hooks` and `core`, `hooks` can use `core`, `core` is self-contained

### Versioning Strategy

This monorepo uses **unified versioning** - all published packages share the same version number and are always released together.

**Published Packages (always at same version):**
- `@youversion/platform-core`
- `@youversion/platform-react-hooks`
- `@youversion/platform-react-ui`

**Benefits:**
- Guaranteed compatibility between all packages
- Simplified dependency management for consumers
- Clear, cohesive release units
- One version number to communicate

**How it works:**
- Changesets enforces unified versioning via the `fixed` configuration
- Any breaking change in any package triggers a major version bump for all packages
- Dependencies between packages automatically use matching versions

**Release Process:**

1. Make your changes
2. Run `pnpm changeset` and select the appropriate bump type:
   - `major` - Breaking changes in any package
   - `minor` - New features (backward compatible)
   - `patch` - Bug fixes
3. Describe the changes in the changeset
4. Submit your PR
5. Once merged to `main`, CI will:
   - Create a release PR with updated versions (all packages bumped together)
   - After release PR is merged, automatically publish to npm

**Note:** Even if you only change one package, all three packages will be versioned and released together. This is intentional and ensures ecosystem consistency.

1. Make your changes
2. Run `pnpm build` to ensure builds pass and type checking succeeds
3. Run tests with `pnpm test` (sequential execution for clear output)
4. Run `pnpm changeset` to document your changes
5. Submit your PR

### Architecture

**Published Packages:**
- `packages/core` - Core API clients and utilities (`@youversion/platform-core`)
- `packages/hooks` - React hooks for Platform APIs (`@youversion/platform-react-hooks`)
- `packages/ui` - React UI components (`@youversion/platform-react-ui`)

**Internal Packages:**
- `tools/*` - Shared TypeScript, ESLint, and testing configurations (never published)

**Dependency Flow:**
- `core` is the foundation layer with API clients and business logic
- `hooks` depends on `core` for data access
- `ui` depends on both `core` and `hooks` for full functionality
- Build order enforced by Turbo: `core` → `hooks` → `ui`

## Acknowledgements

We thank all contributors who have helped make this SDK better through bug reports, feature requests, and code contributions.

## Support

For support, please open an issue in the [GitHub repository](https://github.com/youversion/platform-sdk-react).
