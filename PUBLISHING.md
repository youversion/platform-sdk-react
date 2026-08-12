# Publishing Guide (Maintainers Only)

This guide is for project maintainers who need to set up publishing infrastructure or troubleshoot release issues.

> **Hit something not covered here?** [`RELEASE-RUNBOOK.md`](./RELEASE-RUNBOOK.md) catalogues specific failure modes (EPUBLISHCONFLICT-after-success, transient registry 5xx, provenance attestation failure, expired `NPM_TOKEN`, OTP/2FA, `workspace:*` not rewritten, peer-dep skew, dist-tag drift) with concrete state-check and recovery commands.

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

### `NPM_TOKEN` fallback (token type matters)

The workflow keeps `NPM_TOKEN` as a fallback for any package where Trusted Publishing isn't configured yet. If you set one, generate it as an **Automation token** — not a Publish or personal-user token. Automation tokens explicitly bypass npm's 2FA-on-publish, which CI cannot satisfy. A Publish token will fail every publish with `EOTP` / "need a one-time password" (see [`RELEASE-RUNBOOK.md` §5](./RELEASE-RUNBOOK.md#5-otp--2fa-error-class-wrong-token-type)). Remove `NPM_TOKEN` once all three packages are on Trusted Publishing.

## CDN Stylesheet (bible.css)

When the Release workflow publishes a new `@youversion/platform-react-ui` version, it also uploads the package's compiled stylesheet (`packages/ui/dist/tailwind.css`) to the YouVersion static-asset CDN, where it is served at:

```
https://cdn.youversion.com/platform/<major>/bible.css
```

This lets non-bundler consumers (e.g. server-rendered pages) link a stable stylesheet URL instead of extracting CSS from the npm package.

### The CSS major version constant

The `<major>` path segment is defined in **one place**: the `packages/ui/CDN_CSS_MAJOR_VERSION` file (currently `1`).

- **Do not bump it for routine releases.** The file at `/platform/<major>/bible.css` is overwritten in place with each UI package release.
- **Bump it only when the CSS changes in a breaking way** (selectors/variables/class names that existing consumers depend on are removed or behave differently). Bumping starts publishing to a new `/platform/<major+1>/bible.css` URL and leaves the old file untouched for existing consumers.

### How the upload authenticates

The workflow uses Workload Identity Federation (OIDC) — no static GCP keys, matching how this repo publishes to npm via trusted publishing:

1. `google-github-actions/auth` exchanges the GitHub Actions OIDC token through the `github-actions-pool` Workload Identity Pool in the `yvplatform-prod` GCP project.
2. Only this repository (`youversion/platform-sdk-react`) may impersonate the dedicated service account `platform-sdk-cdn-publisher@yvplatform-prod.iam.gserviceaccount.com`.
3. That service account can only write objects under the `platform/` prefix of the `cdn-yv-platform-prod` origin bucket (IAM condition), nothing else.

Repository Actions secrets:

- `WIF_PROVIDER` — full resource name of the Workload Identity Pool provider
- `WIF_SERVICE_ACCOUNT` — `platform-sdk-cdn-publisher@yvplatform-prod.iam.gserviceaccount.com`

### Caching

`bible.css` is a mutable object at a stable URL, so it is uploaded with `Cache-Control: public, max-age=300, must-revalidate`. Consumers pick up new releases within ~5 minutes.

### Troubleshooting the CDN upload

- On `main` pushes, the upload steps only run when `@youversion/platform-react-ui` is among the published packages.
- npm publishing happens before the CDN upload; a failed upload does not affect the npm release.
- **Do not retry by re-running the failed job**: on a re-run, changesets reports nothing newly published, so the CDN steps are skipped. Instead, after fixing the issue, trigger the **Release workflow manually** (Actions → Release → "Run workflow" on `main`). Manual runs skip versioning/publishing entirely and always rebuild and upload the current stylesheet — the upload is idempotent, so this is always safe.
- Manual dispatches from any ref other than `main` are no-ops (job-level guard), so branch CSS can never overwrite the production stylesheet.

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
- [NPM Trusted Publishing](https://docs.npmjs.com/trusted-publishers)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
