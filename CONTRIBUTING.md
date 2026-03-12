# Contributing to YouVersion Platform React SDKs

## Contribution Policy

Thank you for your interest in contributing to the YouVersion Platform React SDK. We're grateful for the enthusiasm and support from the community.

We are **not yet accepting pull requests** from external contributors, as we're still early enough in the project that we need to keep development focused within our team to ensure a stable and consistent foundation.

**This is temporary.** We plan to welcome code contributions.

### How You Can Help Right Now

Even though we're not accepting code contributions at the moment, there are meaningful ways you can support this project:

- **Use the SDK** — Try it out in your projects and let us know how it goes.
- **Report bugs** — If you find an issue with the SDK, please [open a GitHub issue](https://github.com/youversion/platform-sdk-react/issues).
- **Report platform issues** — For issues with the YouVersion Platform itself (API keys, rate limits, etc.), please reach out via [YouVersion Platform Support](https://platform.youversion.com/support).

---

## Development Setup

The following sections are intended for internal team members contributing to the SDK.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/youversion/platform-sdk-react.git
cd platform-sdk-react

# Install dependencies
pnpm install
```

### Get an app key

You'll need to obtain an app key from <https://platform.youversion.com>

### Set up environment variables

Create an .env.local file in the `./packages/core` package and update the app key variable.

```bash
cp ./packages/core/.env.example ./packages/core/.env.local
```

Create an .env.local file in the `./packages/ui` package and update the app key variable.

```bash
cp ./packages/ui/.env.example ./packages/ui/.env.local
```

> [!NOTE]
> Our React hooks package does not require environment variables at this time.

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

## Dead Code & Dependency Analysis

This monorepo uses [rev-dep](https://github.com/jayu/rev-dep) and [Knip](https://knip.dev) to detect dead code, enforce package boundaries, and find unused dependencies:

| Capability | [rev-dep](https://github.com/jayu/rev-dep) | [Knip](https://knip.dev) |
|------------|:-------:|:----:|
| Package boundary enforcement | ✅ | ❌ |
| Circular dependency detection | ✅ | ❌ |
| Restricted imports (React in core) | ✅ | ❌ |
| Per-package orphan files | ✅ | ✅ |
| **Cross-package dead code** | ❌ | ✅ |
| **Duplicate exports** | ❌ | ✅ |
| Unused deps/devDeps | ✅ | ✅ |

| Command | Description |
|---------|-------------|
| `pnpm analyze` | Run both tools across all packages and display a unified report |
| `pnpm analyze:select` | Interactive picker — choose which packages to analyze |

> **Tip:** Run `pnpm analyze` before opening a PR to catch dead code, boundary violations, or unused dependencies early.

### Development Environment

```bash
# Run the example app with watch mode
pnpm dev:web
```

### Development Guidelines

**Important Rules:**

- ✅ Every PR must pass `pnpm build` (includes type definitions and linting)
- ✅ Always use package imports (e.g., `@youversion/platform-core`), never deep imports
- ✅ Keep exports organized behind barrels (index files)
- ✅ If you add new exports, update the package's "exports" map in package.json
- ✅ Mark internal/private APIs with `/** @internal */` JSDoc comments to exclude them from public .d.ts files
- ✅ Respect package boundaries: `ui` can use `hooks` and `core`, `hooks` can use `core`, `core` is self-contained

### Workflow

1. Make your changes and run `pnpm build` + `pnpm test`
2. Run `pnpm changeset` (select patch/minor/major based on change type)
3. Submit PR → once merged, CI creates a "Version Packages" PR
4. Merge version PR → packages auto-publish to npm

**Note:** All packages use unified versioning and release together.

## Changesets

### When to Create

**Include changesets for:**

- New features or bug fixes
- Breaking changes
- Dependency updates affecting APIs

**Skip changesets for:**

- Documentation
- Internal refactoring
- CI/CD changes

### Writing Summaries

```markdown
# Good
- Added dark mode support to Button component
- Fixed crash on Video unmount

# Bad
- Updated code
- Bug fix
```

## Architecture

- `packages/core` - API clients (`@youversion/platform-core`)
- `packages/hooks` - React hooks (`@youversion/platform-react-hooks`)
- `packages/ui` - React components (`@youversion/platform-react-ui`)
- `tools/*` - Shared configs (not published)

Build order: `core` → `hooks` → `ui`

For maintainers: See [PUBLISHING.md](PUBLISHING.md) for release setup and troubleshooting.
