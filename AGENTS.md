# AGENTS.md

## OVERVIEW
Monorepo for YouVersion Platform SDKs (React Web). pnpm workspaces + Turbo, 3 published packages with unified versioning.

## STRUCTURE
```
packages/
  core/        @youversion/platform-core (API clients, utilities)
  hooks/       @youversion/platform-react-hooks (React hooks)
  ui/          @youversion/platform-react-ui (UI components)
tools/         Shared configs (TS, ESLint)
```

## KEY PATTERNS

**Unified versioning**: All 3 packages share exact same version, always released together

**Build order enforced by Turbo**: core → hooks → ui (dependency chain)

**React 19.1.2 exact pinning**: pnpm overrides lock all React packages to exact version

**Tailwind CSS injection**: Auto-injected as JS constant via tsup define (no build step)

**Changeset workflow**: pnpm changeset → pnpm version-packages → pnpm release

**Trusted publishing**: OIDC-based npm publishing (no tokens)

**Pre-commit**: Husky + lint-staged runs ESLint + Prettier on staged files

## ANTI-PATTERNS

❌ Don't assume shared source directory (each package self-contained)
❌ Don't use API Extractor (listed but not actually used)
❌ Don't expect consistent build tools (core: tsup, hooks: tsc only, ui: tsup + tsc)
❌ Don't modify React version (exact 19.1.2 enforced via pnpm overrides)
❌ Don't use npm/yarn (only pnpm >= 9.0.0 supported)
❌ Don't break unified versioning (all packages versioned together)

## COMMANDS

```bash
# Setup
pnpm install              # Requires pnpm >= 9.0.0, Node >= 20.0.0

# Build
pnpm build               # Turbo builds all in dependency order
pnpm build:core          # Build core only
pnpm build:hooks         # Build hooks only
pnpm build:react         # Build UI only

# Development
pnpm dev:web             # Start UI dev server with hot reload
pnpm test                # Run tests sequentially across all packages
pnpm test:watch          # Watch mode for all packages
pnpm test:coverage       # Coverage reports for all packages

# Quality
pnpm lint                # ESLint all packages
pnpm typecheck           # Type check all packages
pnpm format              # Format all code

# Release
pnpm changeset           # Create changeset entry
pnpm version-packages    # Apply changesets to versions
pnpm release             # Build + publish all packages
```

## CRITICAL GOTCHAS

- Always rebuild dependent packages after modifying core or hooks
- Turbo build cache can skip changes - run `turbo build --force` if needed
- Changesets required for ALL version bumps (even patches)
- Pre-commit hooks fail if typecheck or lint fails
- Workspace protocol: use `workspace:*` in package.json dependencies
- **Unified versioning**: All packages must share exact same version - never version packages independently
- **Node.js requirement**: Minimum version 20.0.0 required for all environments
- One change in a package could break something in another package, so we want to make sure that all tests are passing across the packages before code gets pushed
- When stuck, ask clarifying questions
