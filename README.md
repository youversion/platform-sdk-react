
![image](/assets/github-react-sdk-banner.png)

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Turbo](https://img.shields.io/badge/Turbo-v2.0.0-000000?logo=turbo&logoColor=white)
![tsup](https://img.shields.io/badge/tsup-TypeScript%20bundling%20for%20React%20SDK-3178C6?logo=typescript&logoColor=white)

![pnpm >= 9.0.0](https://img.shields.io/badge/pnpm-%3E%3D%209.0.0%20(required%20for%20workspace%20management)-F69220?logo=pnpm&logoColor=white)
![Changesets](https://img.shields.io/badge/Changesets-Version%20management%20%26%20changelog%20generation-8A2BE2?logo=gitbook&logoColor=white)

![API Extractor](https://img.shields.io/badge/API%20Extractor-Type%20definition%20rollup%20for%20published%20packages-2E8B57?logo=microsoft&logoColor=white)


## Table of Contents

- [YouVersion Platform React SDK](#youversion-platform-react-sdk)
  - [🎯 For Different Use Cases](#-for-different-use-cases)
    - [🎨 UI Component Library](#-ui-component-library)
    - [🔧 API Integration](#-api-integration)
    - [🤖 LLM Integration](#-llm-integration)
  - [🏗 Architecture](#-architecture)
    - [Package Structure](#package-structure)
    - [Build Tools](#build-tools)
    - [Dependency Flow](#dependency-flow)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [📦 Packages](#-packages)
    - [@youversion/platform-core](#youversionplatform-core)
    - [@youversion/platform-react-hooks](#youversionplatform-react-hooks)
    - [@youversion/platform-react-ui](#youversionplatform-react-ui)
  - [🛠 Development](#-development)
    - [Development Environments](#development-environments)
    - [Component Development with Storybook](#component-development-with-storybook)
    - [Build Commands](#build-commands)
    - [Development Commands](#development-commands)
    - [Release Process](#release-process)
  - [🧪 Testing](#-testing)
  - [📝 Contributing](#-contributing)
  - [🔧 Configuration](#-configuration)
    - [Build System](#build-system)
    - [TypeScript](#typescript)
    - [Testing](#testing)
    - [Code Quality](#code-quality)
      - [ESLint configuration (monorepo)](#eslint-configuration-monorepo)
    - [Package Management](#package-management)
    - [CI/CD](#cicd)
    - [Version Control](#version-control)
  - [📄 License](#-license)
  - [🤝 Support](#-support)

# YouVersion Platform React SDK

A comprehensive React SDK for integrating YouVersion Platform features into your web applications. This monorepo provides ready-to-use UI components and powerful hooks for Bible content, search, authentication, and more.

Built with pnpm workspaces and Turbo for build orchestration.

## 🎯 For Different Use Cases

### 🎨 UI Component Library

Ready to add Bible features to your app? Install this React SDK `@youversion/platform-react-ui` for pre-built React components including verse displays, chapter navigation, search interfaces, and reading experiences.

### 🔧 API Integration

Need direct access to YouVersion Platform APIs? See YouVersions comprehensive Platform API documentation and advanced integration patterns, [see our full API documentation here](https://developers.youversion.com/overview).

### 🤖 LLM Integration

Building AI applications with Bible content? Access YouVersion's LLM-optimized endpoints and structured data designed for language models and AI applications, [see our LLM documentation here](https://developers.youversion.com/for-llms).

## 🏗 Architecture

### Package Structure

```
├── packages/
│   ├── core/        # @youversion/platform-core - Core API clients
│   ├── hooks/       # @youversion/platform-react-hooks - React hooks
│   └── ui/          # @youversion/platform-react-ui - React components
├── examples/
│   └── nextjs/             # Next.js example app
├── scripts/                # Build and development scripts
└── tools/                  # Shared configs (TypeScript, ESLint, Testing)
```

### Build Tools

- **pnpm workspaces** (v9.0.0+) - Package management and workspace linking
- **Turbo** (v2.0.0) - Build pipeline orchestration with caching
- **tsup** - TypeScript bundling for React SDK
- **API Extractor** - Type definition rollup for published packages
- **Changesets** - Version management and changelog generation

### Dependency Flow

1. `@youversion/platform-core` - Foundation layer with API clients and utilities
2. `@youversion/platform-react-hooks` - React hooks depending on core
3. `@youversion/platform-react-ui` - UI components depending on hooks and core
4. Build order enforced by Turbo: `core` → `hooks` → `ui`
5. **Unified Versioning**: All packages share the same version number

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0 (required for workspace management)

### Installation

```bash
# Clone the repository
git clone https://github.com/youversion/yvp-react-sdk.git
cd yvp-react-sdk

# Install dependencies (uses pnpm workspaces)
pnpm install

# Build all packages in dependency order (with Turbo caching)
pnpm build
```

## 📦 Packages

All packages use **unified versioning** - they share the same version number and are released together.

### @youversion/platform-core

Core API clients and utilities for YouVersion Platform APIs.

```bash
pnpm add @youversion/platform-core
```

**Use this package** if you need direct API access without React components or hooks.

### @youversion/platform-react-hooks

React hooks for YouVersion Platform APIs.

```bash
pnpm add @youversion/platform-react-hooks
```

**Peer Dependencies:**
- react (^18.0.0 || ^19.0.0)
- Automatically includes `@youversion/platform-core`

### @youversion/platform-react-ui

Ready-to-use React UI components for YouVersion Platform features.

```bash
pnpm add @youversion/platform-react-ui
```

**Peer Dependencies:**
- react (^18.0.0 || ^19.0.0)
- react-dom (^18.0.0 || ^19.0.0)
- Automatically includes `@youversion/platform-core` and `@youversion/platform-react-hooks`

## 🛠 Development

### Development Environments

The monorepo includes a development script for web development:

```bash
# Web development (Next.js + React SDK)
pnpm dev:web
```

The development script automatically:
- Builds and watches SDK packages for changes
- Starts the Next.js example app
- Manages dependencies with Turbo for optimal performance

### Component Development with Storybook

The UI package includes Storybook for component development and documentation:

```bash
# Start Storybook development server
pnpm --filter @youversion/platform-react-ui storybook

# Build Storybook for deployment
pnpm --filter @youversion/platform-react-ui build-storybook
```

**Visual Testing with Chromatic:**

Chromatic provides visual regression testing for components. To use:

1. Create `.env.local` in `packages/ui/` (see [packages/ui/.env.example](packages/ui/.env.example))
2. Add your `CHROMATIC_PROJECT_TOKEN`
3. Run: `pnpm --filter @youversion/platform-react-ui chromatic`

See [packages/ui/README.md](packages/ui/README.md) for details.

### Build Commands

```bash
# Build all packages in dependency order
pnpm build

# Build specific packages
pnpm build:core    # Build core
pnpm build:react   # Build React SDK
```

### Development Commands

```bash
# Run tests (sequential, clear output)
pnpm test          # Run all tests
pnpm test:watch    # Watch mode across packages

# Code quality
pnpm typecheck     # TypeScript type checking
pnpm lint          # ESLint
pnpm format        # Prettier formatting
```

### Release Process

This project uses **unified versioning** - all packages are versioned and released together.

1. Make your changes
2. Run `pnpm changeset` to create a changeset
   - Select appropriate bump type (major/minor/patch)
   - Note: All packages will be bumped together, even if changes only affect one
3. Submit a PR
4. Once merged, the CI/CD pipeline will:
   - Create a release PR with version updates for all packages
   - Publish all packages to npm after release PR is merged

```bash
# Manual release commands (usually handled by CI)
pnpm changeset          # Create changeset
pnpm version-packages   # Update versions (all packages bumped together)
pnpm release           # Build and publish all packages
```

See [CONTRIBUTING.md](CONTRIBUTING.md#versioning-strategy) for detailed versioning strategy.

## 🧪 Testing

The project uses a standardized testing approach with clear, sequential output:

```bash
# Run all tests (sequential execution for clear output)
pnpm test

# Watch mode for development
pnpm test:watch

# Individual package testing
pnpm --filter @youversion/platform-core test
pnpm --filter @youversion/platform-react-hooks test
pnpm --filter @youversion/platform-react-ui test

# Coverage (per package)
pnpm --filter @youversion/platform-core test:coverage
pnpm --filter @youversion/platform-react-hooks test:coverage
```

**Testing Architecture:**
- **Sequential execution**: Tests run one package at a time for clear, debuggable output
- **Vitest**: All packages use Vitest for consistent testing experience
- **React Testing Library**: Used for component and hook testing
- **Watch mode**: Turbo-powered concurrent watching for active development

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔧 Configuration

### Build System

**Turbo Pipeline** (`turbo.json`):
- Orchestrates build tasks with proper dependencies
- Caching enabled for builds, tests, linting, and type checking
- Build order: `dependsOn: ["^build"]` ensures dependencies build first

**Package Bundling**:
- **React SDK**: Uses tsup with `noExternal: ['core']` to bundle dependencies
- **Output formats**: ESM and CommonJS

### TypeScript

- Shared configurations in `tools/tsconfig/`
- Strict mode enabled with comprehensive type checking
- API Extractor generates rolled-up `.d.ts` files for published packages
- Custom verification ensures no internal package references leak

### Testing

- **Test Framework**: Vitest across all packages for consistency
- **React Testing**: React Testing Library for component and hook testing
- **Execution**: Sequential testing for clear, debuggable output (no concurrent jumbled logs)
- **Test files pattern**: `*.test.ts(x)`
- **Coverage**: Available per package with `test:coverage` script

### Code Quality

- **ESLint**: Shared config from `tools/eslint-config/`
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Runs linting on staged files only
- **Maximum warnings**: 0 (enforced in CI)

#### ESLint configuration (monorepo)
- Single flat config shared across the repo. The rule set lives in [tools/eslint-config/index.js](tools/eslint-config/index.js) and is imported by the root [eslint.config.js](eslint.config.js).
- Strict, typed rules are enabled via typescript-eslint v8. React + Hooks rules are enforced.
- Pre-commit uses lint-staged via [/.husky/pre-commit](.husky/pre-commit) and [/.lintstagedrc.json](.lintstagedrc.json).
- Commands:
  - Lint all: `pnpm lint`
  - Typecheck: `pnpm typecheck`
  - Format: `pnpm format`

### Package Management

- `pnpm-workspace.yaml` - Defines workspace packages
- `.npmrc` - pnpm configuration with hoisting patterns
- React versions pinned via pnpm overrides (19.1.0)

### CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`):
- **CI Job**: Runs on all PRs (build, lint, typecheck, test)
- **Release Job**: Runs on main branch
  - Creates release PRs via changesets
  - Publishes to npm with automated versioning

### Version Control

- **Changesets**: Manages versions and changelogs
- **Publishing**: Public packages to npm registry
- **Pre-commit hooks**: Automated quality checks

## 📄 License

MIT

## 🤝 Support

For support, please open an issue in the GitHub repository.
