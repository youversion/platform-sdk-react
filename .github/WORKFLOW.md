# Publishing Workflow - Visual Reference

Quick visual guide to the automated publishing process. See [PUBLISHING.md](./PUBLISHING.md) for detailed instructions.

## End-to-End Flow

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

## Detailed Workflow

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

## Version Bump Examples

### Patch (Bug Fix)

```bash
$ pnpm changeset
? Which packages? @youversion/platform-react-ui
? What kind of change? patch
? Summary: Fixed button onClick in iOS Safari

Result: 0.1.0 → 0.1.1
```

### Minor (New Feature)

```bash
$ pnpm changeset
? Which packages? @youversion/platform-react-ui
? What kind of change? minor
? Summary: Added dark mode to all components

Result: 0.1.1 → 0.2.0
```

### Major (Breaking Change)

```bash
$ pnpm changeset
? Which packages? @youversion/platform-react-ui
? What kind of change? major
? Summary: Removed deprecated Video component props

Result: 0.2.0 → 1.0.0
```

### Multiple Packages

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

## GitHub Actions Jobs

### CI Workflow (on PRs)

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

### Release Workflow (on main)

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

## NPM Provenance Verification

After publishing, users can verify packages on npmjs.com:

```
┌─────────────────────────────────────────────────┐
│ @youversion/platform-react-ui                   │
│                                                 │
│ Provenance                                      │
│ ✓ Built on GitHub Actions                      │
│ ✓ Repository: youversion/yvp-react-sdk         │
│ ✓ Commit: abc123def456                          │
│ ✓ Workflow: .github/workflows/release.yml@main │
└─────────────────────────────────────────────────┘
```

This provides cryptographic proof that the package was built in your CI environment.

## Common Scenarios

### Scenario 1: Single package update

```
1. Fix bug in platform-react-ui
2. pnpm changeset → Select platform-react-ui → patch
3. Open PR → CI passes → Merge
4. "Version Packages" PR created automatically
5. Merge "Version Packages" PR
6. Only platform-react-ui published
```

### Scenario 2: Multiple package update

```
1. Add feature spanning core + hooks + ui
2. pnpm changeset → Select all 3 → minor
3. Open PR → CI passes → Merge
4. "Version Packages" PR created with all 3 packages
5. Merge "Version Packages" PR
6. All 3 packages published together
```

### Scenario 3: Multiple changes before release

```
1. PR #1: Bug fix (changeset: patch)
2. PR #2: New feature (changeset: minor)
3. Both merged to main
4. "Version Packages" PR accumulates BOTH changes
5. Version bump is "minor" (highest bump wins)
6. Merge version PR
7. One release with both changes in CHANGELOG
```

## Quick Reference Commands

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

## Monitoring Releases

### Check GitHub Actions

1. Go to **Actions** tab
2. **CI** workflow shows on PRs
3. **Release** workflow shows on main branch pushes

### Check NPM

1. Visit `https://www.npmjs.com/package/@youversion/platform-react-ui`
2. Verify version updated
3. Check provenance badge

### Check Git Tags

```bash
git fetch --tags
git tag -l "@youversion/*"
```

---

For complete documentation, setup instructions, and troubleshooting, see [PUBLISHING.md](./PUBLISHING.md).
