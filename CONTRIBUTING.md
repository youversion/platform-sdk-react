# Contributing to YouVersion Platform React SDKs

## Development Guidelines

### Package Development Guidelines

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

### Development Workflow

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
