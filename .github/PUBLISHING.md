# NPM Publishing Guide

This repository uses an automated publishing workflow with [Changesets](https://github.com/changesets/changesets) and GitHub Actions.

## Setup (One-time)

### 1. Create NPM Access Token

You need to create an NPM access token and add it to GitHub secrets:

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to **Access Tokens** → **Generate New Token**
3. Select **Automation** token type (not Classic)
4. Copy the token

### 2. Add NPM_TOKEN to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the NPM token from step 1
6. Click **Add secret**

### 3. Configure NPM Package Access

Ensure you have the correct permissions to publish to the `@youversion` scope on NPM.

## Publishing Workflow

See [WORKFLOW.md](./WORKFLOW.md) for a visual diagram of the complete publishing flow.

### Quick Steps

1. **Create a changeset** when you make changes:
   ```bash
   pnpm changeset
   # Select packages, version bump type (major/minor/patch), and write summary
   ```

2. **Open a PR** with your changes and the changeset file

3. **Merge to main** - Release workflow automatically creates/updates a "Version Packages" PR

4. **Merge the "Version Packages" PR** - Packages automatically publish to NPM with provenance! 🎉

## Security Features

This setup includes modern NPM security best practices:

### NPM Provenance

- **What**: Cryptographic proof of where packages were built
- **Benefit**: Users can verify packages were built in your CI
- **Implementation**: Automatic via `NPM_CONFIG_PROVENANCE: true`

### OIDC Authentication

- **What**: Short-lived tokens instead of long-lived NPM tokens
- **Benefit**: More secure, tokens expire automatically
- **Implementation**: Built into GitHub Actions

### Protected Branches

Recommend enabling these branch protections on `main`:
- Require pull request reviews
- Require status checks (CI) to pass
- Require signed commits (optional)

## Manual Publishing (Emergency)

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

## Changeset Guidelines

### Version Types

- **Major** (x.0.0): Breaking changes (API removals, incompatible changes)
- **Minor** (0.x.0): New features, backward compatible additions
- **Patch** (0.0.x): Bug fixes, backward compatible corrections

### Changeset Messages

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

### When to Create Changesets

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

### Multiple Packages

If your change affects multiple packages, select all relevant ones. They'll be versioned and published together.

## Published Packages

This monorepo publishes:

- `@youversion/platform-core` - Core utilities and types
- `@youversion/platform-react-hooks` - React hooks for Platform SDK
- `@youversion/platform-react-ui` - React UI components

**Note**: Example apps (like `nextjs`) and internal tools (`@internal/*`) are automatically excluded from changesets because they're marked as `"private": true` in their package.json files.

### Adding New Examples or Internal Packages

If you add new example apps or internal tools:
1. Mark them as `"private": true` in their package.json
2. They'll be automatically excluded from publishing
3. No changeset configuration needed!

### Understanding Changesets Bot Comments

The changesets-bot may mention private packages like `nextjs` in PR comments. This is normal!

**What's happening:**
- When published packages are bumped, private packages that depend on them get their `package.json` updated to reference the new versions
- The bot reports this as "nextjs will get a patch bump"
- But `nextjs` is **NOT published** - only its dependency references are updated

This is controlled by `"updateInternalDependencies": "patch"` in `.changeset/config.json` and ensures example apps always use the latest package versions.

## Troubleshooting

### "Version Packages" PR not created

- Ensure changesets are committed in `.changeset/` directory
- Check that CI passes on main branch
- Look at the Release workflow logs in GitHub Actions

### Publish failed

- Verify `NPM_TOKEN` is set correctly in GitHub secrets
- Check NPM account has publish permissions for `@youversion` scope
- Review the Release workflow logs for specific errors

### Need to unpublish

You cannot unpublish packages after 72 hours. Within 72 hours:

```bash
npm unpublish @youversion/package-name@version
```

**Better approach**: Publish a new patch version with the fix.

### Deprecate a version

```bash
npm deprecate @youversion/package-name@1.0.0 "Use version 1.0.1+ - fixes critical bug"
```

### Package not showing on NPM

- Check NPM status page
- Verify package name isn't already taken
- Ensure `publishConfig.access: "public"` is set
- Check Release workflow logs for errors

## Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
