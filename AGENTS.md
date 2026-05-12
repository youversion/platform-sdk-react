# YouVersion Platform SDKs – Agent Guide

## QUICK FACTS
- Monorepo: pnpm workspaces + Turborepo
- Packages:
  - `@youversion/platform-core` (pure TS API clients)
  - `@youversion/platform-react-hooks` (React hooks layer)
  - `@youversion/platform-react-ui` (UI components)
- Language: TypeScript
- Test runner: Vitest
- Node: >= 22.0.0
- Package manager: pnpm >= 11.0.0 (no npm/yarn)

## WHERE TO MAKE CHANGES

- **New or changed API endpoints / data types**
  → Add/update Zod schemas and clients in `packages/core`
- **New React data hooks / provider behavior**
  → Implement in `packages/hooks` using `@youversion/platform-core` clients
- **New visual components / styling / UX**
  → Implement in `packages/ui` using hooks from `@youversion/platform-react-hooks`

**Rule of thumb:**
- Core = network + types (no React)
- Hooks = React logic/state around core
- UI = components and styling around hooks

## DEPENDENCY GRAPH

```
@youversion/platform-core  →  @youversion/platform-react-hooks  →  @youversion/platform-react-ui
      (pure TS)                      (React hooks)                      (React components)
```

- Do not introduce reverse dependencies
- Do not import UI or hooks from core
- Do not import UI from hooks

## STRUCTURE
```
packages/
  core/        @youversion/platform-core (API clients, utilities)
  hooks/       @youversion/platform-react-hooks (React hooks)
  ui/          @youversion/platform-react-ui (UI components)
tools/         Shared configs (TS, ESLint)
```

## COMMANDS

```bash
# Setup
pnpm install              # Requires pnpm >= 11.0.0, Node >= 22.0.0

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

## PER-PACKAGE COMMANDS

```bash
# Core
pnpm --filter @youversion/platform-core test
pnpm --filter @youversion/platform-core build

# Hooks
pnpm --filter @youversion/platform-react-hooks test
pnpm --filter @youversion/platform-react-hooks build

# UI
pnpm --filter @youversion/platform-react-ui test
pnpm --filter @youversion/platform-react-ui build
```

## KEY PATTERNS

**Unified versioning**: All 3 packages share exact same version, always released together

**Build order enforced by Turbo**: core → hooks → ui (dependency chain)

**React 19.1.2 exact pinning**: pnpm overrides lock all React packages to exact version

**Tailwind CSS injection**: Built CSS embedded as JS constant via tsup define, rendered by `YouVersionProvider` using React 19 `<style precedence>` (no build step needed by consumers)

**Changeset workflow**: pnpm changeset → pnpm version-packages → pnpm release

**Trusted publishing**: OIDC-based npm publishing (no tokens)

**Pre-commit**: Husky + lint-staged runs ESLint + Prettier on staged files

## CRITICAL GOTCHAS

### Build & Dependencies
- Always rebuild dependent packages after modifying core or hooks
- Turbo build cache can skip changes - run `turbo build --force` if needed
- Workspace protocol: use `workspace:*` in package.json dependencies

### Versioning & Release
- Changesets required for ALL version bumps (even patches)
- **Unified versioning**: All packages must share exact same version - never version packages independently
- Pre-commit hooks fail if typecheck or lint fails

### Environment
- **Node.js requirement**: Minimum version 22.0.0 required (pnpm 11 requires Node >= 22.13)
- **React version**: Do not change React dependencies; pnpm overrides (in `pnpm-workspace.yaml`) enforce 19.1.2
- **Package manager**: Do not use npm/yarn; only pnpm supported
- **Supply-chain protection**: `minimumReleaseAge: 4320` (3-day cooldown) in `pnpm-workspace.yaml` — `pnpm install` will reject packages published < 3 days ago. Override with `--force` if needed urgently. Workspace packages (`workspace:*`) are inherently excluded as they aren't fetched from the registry.
- **pnpm 11 breaking changes**: Overrides moved from `package.json` → `pnpm-workspace.yaml`; build scripts require `allowBuilds` approval; `@internal/eslint-config` and `eslint-plugin-storybook` must be root devDependencies for resolution

### Package Boundaries (FOR AGENTS)
- **Core must remain React-free** – do not import React or DOM APIs in `packages/core`
- **Hooks should not duplicate core logic** – call core clients instead of re-implementing HTTP
- **UI should not talk to the network directly** – always use hooks/core

### Testing
- One change in a package could break something in another package, so we want to make sure that all tests are passing across the packages before code gets pushed

### When Stuck
- Ask clarifying questions

## ANTI-PATTERNS

❌ Don't assume shared source directory (each package self-contained)
❌ Don't use API Extractor (listed but not actually used)
❌ Don't expect consistent build tools (core: tsup, hooks: tsc only, ui: tsup + tsc)
❌ Don't modify React version (exact 19.1.2 enforced via pnpm overrides in `pnpm-workspace.yaml`)
❌ Don't use npm/yarn (only pnpm >= 11.0.0 supported)
❌ Don't break unified versioning (all packages versioned together)

## MORE DETAIL PER PACKAGE

- `packages/core/AGENTS.md` – API clients, schemas, auth
- `packages/hooks/AGENTS.md` – React hooks, providers
- `packages/ui/AGENTS.md` – UI components, styling, build order
