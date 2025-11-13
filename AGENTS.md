One AGENTS.md works across many agents, such as GitHub Copilot, Roo Code, Open AI's Codex, Devin, and more. This is a README for agents to help AI coding agents work on this project.

## Project Overview

This is a monorepo for YouVersion Platform SDKs for React Web. The project uses pnpm workspaces, TypeScript, and Turbo for build orchestration.

## Development Commands

### Essential Commands
```bash
# Install dependencies (requires pnpm >= 9.0.0)
pnpm install

# Build all packages in correct order
pnpm build

# Run tests across all packages (sequential execution for clear output)
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Start development environment
pnpm dev:web            # For React SDK development
```

### Package-Specific Commands
```bash
# Build specific packages
pnpm build:core    # Build core
pnpm build:react   # Build React SDK

# Run tests in watch mode
pnpm test:watch

# Run individual package tests with coverage
pnpm --filter @youversion/platform-core test:coverage
pnpm --filter @youversion/platform-react-hooks test:coverage

# Build and verify outputs
pnpm build
```

### Release Process
```bash
# Create a changeset for version updates
pnpm changeset

# Version packages based on changesets
pnpm version-packages

# Build and publish packages
pnpm release
```

## Architecture

### Monorepo Structure
```
├── packages/
│   ├── core/       # Internal core package
│   └── ui/         # @youversion/platform-react-ui - Published React SDK
├── tools/                 # Shared configs (TypeScript, ESLint, Jest)
└── scripts/              # Build and development scripts
```

### Key Architectural Patterns

1. **Internal Dependencies**: The published SDK (`@youversion/platform-react-ui`) depends on the internal workspace package (`core`)

2. **Build Order**: Dependencies must be built in order:
   - First: `core`
   - Finally: SDK packages

3. **Internal Packages**: The internal workspace package (`core`) contains bundled shared code

4. **UI Components**: All UI components use React.forwardRef and accept standard HTML attributes

5. **TypeScript Configuration**: Shared configs in `tools/tsconfig/`

6. **Testing**: 
   - React SDK uses Vitest
   - Test files follow `*.test.ts(x)` pattern

### Build System

- **Turbo**: Orchestrates builds with caching and dependency management
- **tsup**: Bundles TypeScript for packages
- **API Extractor**: Generates single .d.ts file for published packages
- **Changesets**: Manages versioning and changelogs

### Code Quality

- **Pre-commit hooks**: Husky runs lint-staged on git commits
- **Lint-staged**: Runs ESLint and Prettier on staged files
- **TypeScript**: Strict mode enabled, no implicit any
- **ESLint**: Shared config from `tools/eslint-config/`

### Publishing

- Published packages: `@youversion/platform-react-ui`
- Internal packages (`core`) are private
- NPM registry: https://registry.npmjs.org/
- Access: public

## Important Notes

1. Always run `pnpm install` after pulling changes
2. Use `pnpm` (not npm or yarn) for all operations
3. Node.js >= 20.0.0 required
4. When modifying shared code, rebuild dependent packages
