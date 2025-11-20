# Publishing Guide (Maintainers Only)

This guide is for project maintainers who need to set up publishing infrastructure or troubleshoot release issues.

## How Publishing Works

The repository uses [Changesets](https://github.com/changesets/changesets) with GitHub Actions for automated publishing.

### Process

1. Developer creates changeset with `pnpm changeset`
2. Developer opens PR (CI runs lint/test/build)
3. PR merges to `main`
4. Release workflow creates/updates "Version Packages" PR
5. Merge "Version Packages" PR
6. Packages auto-publish to NPM with provenance

## Authentication

This repository uses **NPM Trusted Publishing** via OIDC (OpenID Connect), which eliminates the need for long-lived NPM tokens.

### How It Works

1. GitHub Actions workflow has `id-token: write` permission
2. NPM packages are configured with GitHub as a trusted publisher
3. During publish, GitHub provides a short-lived OIDC token to NPM
4. NPM validates the token and allows publishing
5. All publishes include cryptographic provenance

### Setting Up Trusted Publishing

For each package, configure trusted publishing on NPM:

1. Go to `https://www.npmjs.com/package/PACKAGE_NAME/access`
2. Under "Publishing access", select "Trusted publishers"
3. Click "Add trusted publisher"
4. Configure:
   - **Provider**: GitHub Actions
   - **GitHub Organization**: `youversion` (or your org)
   - **Repository**: `platform-sdk-react`
   - **Workflow**: `release.yml`
   - **Environment**: Leave empty

Required packages:
- `@youversion/platform-core`
- `@youversion/platform-react-hooks`
- `@youversion/platform-react-ui`

### Benefits

- No NPM_TOKEN to rotate or manage
- Stronger security via short-lived tokens
- Automatic provenance generation
- Audit trail of all publishes

## Troubleshooting

### "Version Packages" PR Not Created

- Check changesets exist in `.changeset/` directory
- Verify CI passes on main branch
- Review Release workflow logs in GitHub Actions

### Publish Failed

- Verify trusted publishing is configured for all packages on NPM
- Check NPM permissions for `@youversion` scope
- Ensure GitHub Actions workflow has `id-token: write` permission
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

**Important:** Manual publishing from local machines is not supported with trusted publishing. Packages can only be published via the GitHub Actions workflow.

If the automated workflow fails:

1. Fix the issue in the workflow
2. Re-trigger the release by:
   - Pushing a fix to the "Version Packages" PR, or
   - Manually re-running the Release workflow from GitHub Actions UI

If you absolutely must publish manually (requires NPM account access):

```bash
# 1. Create changeset
pnpm changeset

# 2. Version packages
pnpm version-packages

# 3. Build all packages
pnpm build

# 4. Publish (requires NPM authentication and account to be added as trusted publisher)
npm login
pnpm release
```

**Note:** Manual publishing requires:
- NPM account with publish access to `@youversion` scope
- Account configured as a trusted publisher on NPM
- Will include provenance if using `npm` CLI with proper authentication

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
- [NPM Trusted Publishing](https://docs.npmjs.com/configuring-your-npm-token-to-use-openid-connect)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
