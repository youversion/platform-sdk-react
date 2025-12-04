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
│   ├── core/       # @youversion/platform-core - Published core package
│   ├── hooks/      # @youversion/platform-react-hooks - Published React hooks
│   └── ui/         # @youversion/platform-react-ui - Published React SDK
├── tools/                 # Shared configs (TypeScript, ESLint, Jest)
└── scripts/              # Build and development scripts
```

### Key Architectural Patterns

1. **Package Dependencies**:
   - `core` is the foundation (API clients, utilities)
   - `hooks` depends on `core`
   - `ui` depends on both `hooks` and `core`

2. **Build Order**: Dependencies must be built in order:
   - First: `core`
   - Second: `hooks`
   - Finally: `ui`

3. **Unified Versioning**: All published packages share the same version number and are released together

4. **UI Components**: All UI components use React.forwardRef and accept standard HTML attributes

5. **TypeScript Configuration**: Shared configs in `tools/tsconfig/`

6. **Testing**:
   - All packages use Vitest
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

- Published packages:
  - `@youversion/platform-core`
  - `@youversion/platform-react-hooks`
  - `@youversion/platform-react-ui`
- All packages use unified versioning (same version number)
- NPM registry: https://registry.npmjs.org/
- Access: public

## Review Guidelines

When conducting code reviews, AI agents should systematically evaluate the following aspects:

### Code Standards and Conventions
- Do the changes follow the established conventions and patterns used throughout the codebase?
- Is the code style consistent with existing code (indentation, naming conventions, file organization)?
- Are the appropriate design patterns being used where applicable?
- Does the code follow the monorepo structure and package boundaries?
- Are TypeScript types properly defined and avoiding `any` types?
- Do components follow the React.forwardRef pattern for UI components?

### Security Assessment
- Do the changes introduce any security vulnerabilities or risks?
- Are user inputs properly validated and sanitized?
- Is sensitive data properly handled and protected?
- Are authentication and authorization checks properly implemented?
- Are there any exposed API keys, credentials, or sensitive configuration data?
- Are network requests using appropriate security protocols (HTTPS, proper headers)?
- Is XSS protection properly implemented (no dangerouslySetInnerHTML without sanitization)?
- Are Content Security Policy considerations met?

### Performance Considerations
- Do the changes introduce potential performance bottlenecks?
- Are there any inefficient algorithms or data structures being used?
- Is there unnecessary re-rendering or state updates in React components?
- Are React hooks (useMemo, useCallback, memo) used appropriately to prevent unnecessary renders?
- Are large lists properly virtualized where appropriate?
- Is lazy loading implemented for heavy resources and code splitting used effectively?
- Are bundle sizes kept reasonable (check with build output)?
- Is tree-shaking working properly for unused exports?
- Are web vitals (LCP, FID, CLS) maintained or improved?

### React/TypeScript Best Practices
- Are components properly optimized using React.memo, useMemo, and useCallback where appropriate?
- Is component composition preferred over prop drilling?
- Are custom hooks following the Rules of Hooks?
- Is proper error boundary implementation in place?
- Are TypeScript generics used effectively for reusable components?
- Is strict mode TypeScript being followed (no implicit any, proper null checking)?
- Are discriminated unions used for complex state management?
- Are React 18+ features (Suspense, concurrent features) used appropriately?

### Package Architecture
- Does the code respect package boundaries (core → hooks → ui dependency order)?
- Are internal APIs properly exported through package index files?
- Is the unified versioning strategy maintained?
- Are workspace dependencies correctly referenced?
- Does the code follow the established build order requirements?

### Functional Verification
- Does the code actually implement what the PR description claims?
- Are all acceptance criteria from the related issue/ticket met?
- Are edge cases properly handled?
- Is error handling comprehensive and user-friendly?
- Are all promised features fully implemented and working?
- Do changes work across all supported browsers?

### Testing and Documentation
- Are appropriate tests included for new functionality (using Vitest)?
- Do tests follow the *.test.ts(x) naming pattern?
- Do existing tests still pass?
- Is the code self-documenting with clear variable and function names?
- Are complex logic sections properly commented?
- Are API changes documented with proper TypeScript JSDoc?
- Are breaking changes clearly identified in changesets?
- Is test coverage maintained or improved?

### Dependencies and Compatibility
- Are new dependencies necessary and well-maintained?
- Do new dependencies have appropriate TypeScript types?
- Are version requirements appropriate and following semver?
- Is backward compatibility maintained where expected?
- Are deprecated APIs avoided?
- Are peer dependencies properly defined for the published packages?
- Is the minimum Node.js version (>= 20.0.0) respected?

### Build System and Tooling
- Do changes work with the Turbo build cache?
- Are tsup configurations properly maintained?
- Does API Extractor successfully generate type definitions?
- Do lint and format commands pass successfully?
- Are pre-commit hooks passing?
- Are changeset entries created for user-facing changes?

### Accessibility
- Are ARIA attributes properly implemented?
- Is keyboard navigation fully supported?
- Are focus states clearly visible?
- Do interactive elements have appropriate roles?
- Are form inputs properly labeled?
- Is color contrast WCAG compliant?
- Are screen reader announcements appropriate?

### User Experience
- Do the changes provide a smooth and intuitive user experience?
- Are loading states and error states properly handled?
- Is feedback provided for user actions?
- Are animations performant and purposeful (respecting prefers-reduced-motion)?
- Is responsive design maintained across viewport sizes?
- Are browser-specific quirks handled appropriately?

### Developer Experience
- Is the API intuitive and consistent with existing patterns?
- Are TypeScript types providing good IDE support and autocomplete?
- Are error messages helpful and actionable?
- Is the component API well-designed and flexible?
- Are props properly documented with JSDoc comments?
- Are examples provided for complex usage patterns?

## Important Notes

1. Always run `pnpm install` after pulling changes
2. Use `pnpm` (not npm or yarn) for all operations
3. Node.js >= 20.0.0 required
4. When modifying packages, rebuild dependent packages in order (core → hooks → ui)
5. All packages use unified versioning - they're always released together at the same version
