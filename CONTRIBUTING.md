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

## Publishing & Releases

### Setup (One-time)

#### 1. Create NPM Access Token

You need to create an NPM access token and add it to GitHub secrets:

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to **Access Tokens** → **Generate New Token**
3. Select **Automation** token type (not Classic)
4. Copy the token

#### 2. Add NPM_TOKEN to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the NPM token from step 1
6. Click **Add secret**

#### 3. Configure NPM Package Access

Ensure you have the correct permissions to publish to the `@youversion` scope on NPM.

### Publishing Workflow

The repository uses an automated publishing workflow with [Changesets](https://github.com/changesets/changesets) and GitHub Actions.

#### End-to-End Flow

```
Developer makes changes
        │
        ▼
   pnpm changeset
        │
        ▼
  Commit & open PR
        │
        ▼
  CI runs (lint/test/build)
        │
        ▼
    Merge to main
        │
        ▼
Release workflow detects changeset
        │
        ├─→ No "Version Packages" PR exists
        │   └─→ Create "Version Packages" PR
        │
        └─→ "Version Packages" PR exists
            └─→ Update it

Review & merge "Version Packages" PR
        │
        ▼
Release workflow publishes to NPM
        │
        ├─→ Publish with provenance
        ├─→ Create git tags
        └─→ Post summary to GitHub Actions
        │
        ▼
    ✅ Published to NPM!
```

#### Detailed Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Developer makes changes and creates changeset                │
│    $ pnpm changeset                                             │
│    ✓ Select: @youversion/platform-react-ui                      │
│    ✓ Version: minor                                             │
│    ✓ Summary: "Added dark mode support"                         │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Commit changeset and open PR                                 │
│    .changeset/brave-lions-dance.md                              │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CI Workflow (runs in parallel)                               │
│    ✓ Lint                                                       │
│    ✓ Type Check                                                 │
│    ✓ Tests                                                      │
│    ✓ Build                                                      │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Merge PR to main                                             │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Release Workflow creates/updates "Version Packages" PR       │
│    Changes in PR:                                               │
│    • packages/ui/package.json (0.1.0 → 0.2.0)                   │
│    • packages/ui/CHANGELOG.md (new entry)                       │
│    • .changeset/brave-lions-dance.md (deleted)                  │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Review and merge "Version Packages" PR                       │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Release Workflow publishes to NPM                            │
│    • Builds all packages                                        │
│    • Authenticates via OIDC (secure, short-lived token)         │
│    • Publishes with provenance                                  │
│    • Creates git tags (@youversion/platform-react-ui@0.2.0)     │
│    • Posts summary to GitHub Actions                            │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Package published to npmjs.com!                              │
│    • Provenance badge visible                                   │
│    • Users can verify it was built in CI                        │
│    • Git tag created for the release                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Quick Steps

1. **Create a changeset** when you make changes:
   ```bash
   pnpm changeset
   # Select packages, version bump type (major/minor/patch), and write summary
   ```

2. **Open a PR** with your changes and the changeset file

3. **Merge to main** - Release workflow automatically creates/updates a "Version Packages" PR

4. **Merge the "Version Packages" PR** - Packages automatically publish to NPM with provenance!

#### GitHub Actions Jobs

##### CI Workflow (on PRs)

```
PR Opened/Updated
    │
    ├── Lint ────────┐
    ├── Typecheck ───┤ (parallel)
    ├── Test ────────┤
    └── Build ───────┘
            │
            └──→ All pass? Merge allowed
```

##### Release Workflow (on main)

```
Push to main
    │
    └── Has changeset files?
            │
            ├── YES → Create/Update "Version Packages" PR
            │
            └── NO → Check if "Version Packages" was just merged
                    │
                    └── YES → Build & Publish to NPM
```

#### Quick Reference Commands

```bash
# Create changeset
pnpm changeset

# Preview what versions will be
pnpm changeset status

# Version packages locally (usually done by CI)
pnpm version-packages

# Build all packages
pnpm build

# Publish (usually done by CI)
pnpm release

# Check what will be published
npm pack --dry-run
```

#### Monitoring Releases

##### Check GitHub Actions

1. Go to **Actions** tab
2. **CI** workflow shows on PRs
3. **Release** workflow shows on main branch pushes

##### Check NPM

1. Visit `https://www.npmjs.com/package/@youversion/platform-react-ui`
2. Verify version updated
3. Check provenance badge

##### Check Git Tags

```bash
git fetch --tags
git tag -l "@youversion/*"
```

### Changeset Guidelines

#### Version Types

- **Major** (x.0.0): Breaking changes (API removals, incompatible changes)
- **Minor** (0.x.0): New features, backward compatible additions
- **Patch** (0.0.x): Bug fixes, backward compatible corrections

#### Changeset Messages

Write clear, user-facing messages that will appear in CHANGELOGs:

```markdown
# ✓ Good - Specific and informative
- Added support for custom themes in Button component
- Fixed crash when Video component unmounts during playback
- Breaking: Removed deprecated `onComplete` prop, use `onEnded` instead

# ✗ Bad - Too vague
- Updated code
- Bug fix
- Changes
```

#### When to Create Changesets

**Create changesets for:**
- New features or components
- Bug fixes that affect users
- Breaking changes
- Performance improvements
- Dependency updates that affect user-facing APIs

**Skip changesets for:**
- Documentation-only changes
- Internal refactoring (no API changes)
- Dev dependency updates
- CI/CD configuration changes
- README or comment updates

#### Multiple Packages

If your change affects multiple packages, select all relevant ones. They'll be versioned and published together.

#### Version Bump Examples

##### Patch (Bug Fix)

```bash
$ pnpm changeset
? Which packages? @youversion/platform-react-ui
? What kind of change? patch
? Summary: Fixed button onClick in iOS Safari

Result: 0.1.0 → 0.1.1
```

##### Minor (New Feature)

```bash
$ pnpm changeset
? Which packages? @youversion/platform-react-ui
? What kind of change? minor
? Summary: Added dark mode to all components

Result: 0.1.1 → 0.2.0
```

##### Major (Breaking Change)

```bash
$ pnpm changeset
? Which packages? @youversion/platform-react-ui
? What kind of change? major
? Summary: Removed deprecated Video component props

Result: 0.2.0 → 1.0.0
```

##### Multiple Packages

```bash
$ pnpm changeset
? Which packages?
  ✓ @youversion/platform-core
  ✓ @youversion/platform-react-hooks
  ✓ @youversion/platform-react-ui
? What kind of change? minor
? Summary: Added video playlist support across all packages
```

All selected packages will be versioned and published together.

#### Common Scenarios

##### Scenario 1: Single package update

```
1. Fix bug in platform-react-ui
2. pnpm changeset → Select platform-react-ui → patch
3. Open PR → CI passes → Merge
4. "Version Packages" PR created automatically
5. Merge "Version Packages" PR
6. Only platform-react-ui published
```

##### Scenario 2: Multiple package update

```
1. Add feature spanning core + hooks + ui
2. pnpm changeset → Select all 3 → minor
3. Open PR → CI passes → Merge
4. "Version Packages" PR created with all 3 packages
5. Merge "Version Packages" PR
6. All 3 packages published together
```

##### Scenario 3: Multiple changes before release

```
1. PR #1: Bug fix (changeset: patch)
2. PR #2: New feature (changeset: minor)
3. Both merged to main
4. "Version Packages" PR accumulates BOTH changes
5. Version bump is "minor" (highest bump wins)
6. Merge version PR
7. One release with both changes in CHANGELOG
```

### Published Packages

This monorepo publishes:

- `@youversion/platform-core` - Core utilities and types
- `@youversion/platform-react-hooks` - React hooks for Platform SDK
- `@youversion/platform-react-ui` - React UI components

**Note**: Example apps (like `nextjs`) and internal tools (`@internal/*`) are automatically excluded from changesets because they're marked as `"private": true` in their package.json files.

#### Adding New Examples or Internal Packages

If you add new example apps or internal tools:
1. Mark them as `"private": true` in their package.json
2. They'll be automatically excluded from publishing
3. No changeset configuration needed!

#### Understanding Changesets Bot Comments

The changesets-bot may mention private packages like `nextjs` in PR comments. This is normal!

**What's happening:**
- When published packages are bumped, private packages that depend on them get their `package.json` updated to reference the new versions
- The bot reports this as "nextjs will get a patch bump"
- But `nextjs` is **NOT published** - only its dependency references are updated

This is controlled by `"updateInternalDependencies": "patch"` in `.changeset/config.json` and ensures example apps always use the latest package versions.

### Security Features

#### NPM Provenance

- **What**: Cryptographic proof of where packages were built
- **Benefit**: Users can verify packages were built in your CI
- **Implementation**: Automatic via `NPM_CONFIG_PROVENANCE: true`

#### OIDC Authentication

- **What**: Short-lived tokens instead of long-lived NPM tokens
- **Benefit**: More secure, tokens expire automatically
- **Implementation**: Built into GitHub Actions

#### Protected Branches

Recommend enabling these branch protections on `main`:
- Require pull request reviews
- Require status checks (CI) to pass
- Require signed commits (optional)

### Troubleshooting

#### "Version Packages" PR not created

- Ensure changesets are committed in `.changeset/` directory
- Check that CI passes on main branch
- Look at the Release workflow logs in GitHub Actions

#### Publish failed

- Verify `NPM_TOKEN` is set correctly in GitHub secrets
- Check NPM account has publish permissions for `@youversion` scope
- Review the Release workflow logs for specific errors

#### Need to unpublish

You cannot unpublish packages after 72 hours. Within 72 hours:

```bash
npm unpublish @youversion/package-name@version
```

**Better approach**: Publish a new patch version with the fix.

#### Deprecate a version

```bash
npm deprecate @youversion/package-name@1.0.0 "Use version 1.0.1+ - fixes critical bug"
```

#### Package not showing on NPM

- Check NPM status page
- Verify package name isn't already taken
- Ensure `publishConfig.access: "public"` is set
- Check Release workflow logs for errors

### Manual Publishing (Emergency)

If you need to publish manually:

```bash
# 1. Create changeset
pnpm changeset

# 2. Version packages
pnpm version-packages

# 3. Build all packages
pnpm build

# 4. Publish (requires NPM authentication)
pnpm release
```

**Note**: Manual publishing won't include NPM provenance.

### Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## Architecture

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
