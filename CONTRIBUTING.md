# Contributing to YouVersion Platform React SDKs

## Development Guidelines

### Internal Shared Code

This monorepo uses a private workspace package (`core`) for internal shared code in the React SDK.

**Important Rules:**

- ❌ Do not deep import from the shared package. Always use package name `core` from the SDK.
- ❌ `core` is private; never publish it.
- ✅ Every PR must pass `pnpm verify` (build + DTS checks).
- ✅ Keep shared exports behind barrels (`core`, `api`). Don't deep-import internals.
- ✅ If you add new barrels in shared, update the "exports" map and rebuild the SDK.
- ✅ Prefer small, stable types in shared; mark non-API items with `/** @internal */` to keep them out of public .d.ts.

### Development Workflow

1. Make your changes
2. Run `pnpm verify` to ensure builds pass and type checking succeeds
3. Run tests with `pnpm test` (sequential execution for clear output)
4. Submit your PR

### Architecture

- `packages/core` - Internal core code (never published)
- `packages/ui` - React SDK (`@youversion/platform-react-ui`)

The internal shared package is bundled into the SDK and inlined into the TypeScript declarations, ensuring consumers never see internal implementation details.
