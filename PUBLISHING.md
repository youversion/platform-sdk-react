# Publishing Guide (Maintainers Only)

This guide is for project maintainers who need to set up publishing infrastructure or troubleshoot release issues.

## Initial Setup

### 1. Create NPM Access Token

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to **Access Tokens** → **Generate New Token**
3. Select **Automation** token type
4. Copy the token

### 2. Add NPM_TOKEN to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the NPM token
6. Click **Add secret**

### 3. Configure NPM Package Access

Ensure you have publish permissions for the `@youversion` scope on NPM.

## How Publishing Works

The repository uses [Changesets](https://github.com/changesets/changesets) with GitHub Actions for automated publishing.

### Process

1. Developer creates changeset with `pnpm changeset`
2. Developer opens PR (CI runs lint/test/build)
3. PR merges to `main`
4. Release workflow creates/updates "Version Packages" PR
5. Merge "Version Packages" PR
6. Packages auto-publish to NPM with provenance

## Security Features

### NPM Provenance
Cryptographic proof packages were built in CI. Users can verify authenticity.

### OIDC Authentication
Short-lived tokens instead of permanent NPM tokens. More secure.

### Protected Branches
Recommended for `main`:
- Require PR reviews
- Require status checks to pass
- Require signed commits (optional)

## Troubleshooting

### "Version Packages" PR Not Created

- Check changesets exist in `.changeset/` directory
- Verify CI passes on main branch
- Review Release workflow logs in GitHub Actions

### Publish Failed

- Verify `NPM_TOKEN` is set in GitHub secrets
- Check NPM permissions for `@youversion` scope
- Review Release workflow logs

### Need to Unpublish

Cannot unpublish after 72 hours. Within 72 hours:

```bash
npm unpublish @youversion/package-name@version
```

**Better:** Publish a patch version with the fix.

### Deprecate a Version

```bash
npm deprecate @youversion/package-name@1.0.0 "Use 1.0.1+ - fixes critical bug"
```

### Package Not Showing on NPM

- Check NPM status page
- Verify package name isn't taken
- Ensure `publishConfig.access: "public"` in package.json
- Review Release workflow logs

## Manual Publishing (Emergency Only)

If automated publishing fails:

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

**Note:** Manual publishing won't include NPM provenance.

## Monitoring Releases

### GitHub Actions

1. Go to **Actions** tab
2. **CI** workflow (PRs)
3. **Release** workflow (main branch)

### NPM

1. Visit `https://www.npmjs.com/package/@youversion/platform-react-ui`
2. Verify version updated
3. Check provenance badge

### Git Tags

```bash
git fetch --tags
git tag -l "@youversion/*"
```

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
