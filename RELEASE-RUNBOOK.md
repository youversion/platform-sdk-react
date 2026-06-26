# Release Runbook (Web-SDK-specific)

When a release encounters something the generic Changesets / npm flow doesn't cover, this runbook is the place to look. For the normal happy-path flow and generic publish troubleshooting (auth, "Version Packages" PR not appearing, deprecate / unpublish), see [PUBLISHING.md](./PUBLISHING.md).

This runbook covers failure modes that survive the [`changesets/action`](https://github.com/changesets/action) abstraction — either because they happen below it (npm registry, OIDC provider) or because the operator needs to understand them to diagnose what they're seeing in workflow logs.

For the equivalent runbook on the React Native side, see [`platform-sdk-reactnative-expo`'s RELEASE-RUNBOOK.md](https://github.com/youversion/platform-sdk-reactnative-expo/blob/main/RELEASE-RUNBOOK.md). The two repos share the same Changesets flow, so most procedures here apply there too — diverging only on platform-specific concerns (peer-dep skew on RN, React/React-DOM compatibility on Web).

---

## 1. `EPUBLISHCONFLICT` after success

**Symptom.** `pnpm publish` (invoked by `changeset publish`) exits non-zero with `EPUBLISHCONFLICT` or `You cannot publish over the previously published versions`, but `npm view @youversion/platform-react-ui@$VERSION version` returns `$VERSION`. The registry accepted the publish; the response came back as a conflict because npm's deduplication fired before the response was sent — or because a previous retry attempt already landed.

**Why it happens.** npm publish is not idempotent: re-publishing the same version-tarball pair returns `EPUBLISHCONFLICT` even when the registry already has exactly what you tried to publish. Changesets-action treats this as a hard fail by default.

**State check.**

```bash
for p in @youversion/platform-core @youversion/platform-react-hooks @youversion/platform-react-ui; do
  echo "== $p @ $VERSION =="
  npm view "${p}@${VERSION}" version 2>/dev/null || echo "  NOT on npm"
done
```

If `$VERSION` is on the registry for all packages that should have shipped, the release is **complete** — the workflow's non-zero exit is a false negative.

**Recovery.**

- **All packages on registry, but workflow failed.** No re-publish needed. Changesets tags and releases **per package** — `@youversion/platform-core@$VERSION`, `@youversion/platform-react-hooks@$VERSION`, `@youversion/platform-react-ui@$VERSION` — not a single bare `$VERSION` tag. Verify each tag was pushed and each GitHub release exists, and create any that are missing:
  ```bash
  for p in @youversion/platform-core @youversion/platform-react-hooks @youversion/platform-react-ui; do
    tag="${p}@${VERSION}"
    git ls-remote --exit-code origin "refs/tags/${tag}" >/dev/null 2>&1 \
      || { git tag "$tag" && git push origin "$tag"; }
    gh release view "$tag" >/dev/null 2>&1 \
      || gh release create "$tag" --notes-file CHANGELOG-entry.md  # changesets-generated body for that package
  done
  ```
- **Some packages on registry, others not.** Re-run the workflow. Changesets-action will skip the published packages (it reads the registry before publishing each) and retry the rest. If a specific package keeps failing, see #3 or #4.

**Expected end state.** All three packages at `$VERSION` on npm, with a matching `<pkg>@$VERSION` tag and GitHub release each.

---

## 2. Registry transient failure (timeout / 5xx / network)

**Symptom.** `pnpm publish` exits non-zero with one of: `ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, `503 Service Unavailable`, `502 Bad Gateway`, `504 Gateway Time-out`, `fetch failed`, `Could not resolve host`.

**State check.** Same as #1 — `npm view` each package. Transient failures may or may not have recorded the publish before the error surfaced.

**Recovery.** Re-run the release workflow from the Actions tab. Changesets-action re-reads the registry per package before publishing; anything that landed during the failed run is skipped automatically. If the registry is genuinely down (status page red), wait and re-run later.

If retries are wanted *automatically*, that's a Changesets-action upstream feature request — the project doesn't expose retry config today. Watch the workflow and re-trigger manually if needed.

**Expected end state.** All three packages at `$VERSION` on npm.

---

## 3. Provenance attestation failure (publish succeeded, attestation missing)

**Symptom.** `pnpm publish` exits non-zero with text mentioning `attestation`, `provenance`, `OIDC`, or `Sigstore`. The package itself may or may not have published — provenance generation is a separate step from the publish itself and either can fail independently.

**Possible underlying causes.**

- `id-token: write` permission missing from the workflow (it is present in [`release.yml`](.github/workflows/release.yml)).
- The npm-side trust policy for this repo / workflow isn't configured for one of the three packages.
- Sigstore / npm provenance service has a transient outage (rare; treat as transient).

**State check.** `npm view <pkg>@<version>` — if the version is there, the publish succeeded. Check the provenance badge on the package page (`https://www.npmjs.com/package/<pkg>/v/<version>`):

```bash
npm view "@youversion/platform-react-ui@${VERSION}" --json | jq '.dist.attestations'
```

If `.dist.attestations` is `null` or absent, the publish landed without provenance.

**Recovery.**

- **Version is on registry without provenance.** Release is usable; consumers will install fine but lose the supply-chain attestation for this version. To attest after the fact: not currently supported by npm — you'd have to bump the version and re-publish.
  1. Verify `id-token: write` is in `release.yml`'s `permissions:` block.
  2. Verify the npm trust policy (`https://www.npmjs.com/package/<pkg>/access` → Trusted publishers) lists this workflow.
  3. If both are correct, treat as transient and accept the missing attestation for this version. Next release should attest cleanly.
- **Version not on registry.** Re-run the workflow. Changesets-action publishes attestation alongside; both succeed or fail per-package.

**Expected end state.** All three packages at `$VERSION` on npm, ideally with provenance attestations.

---

## 4. Expired / invalid `NPM_TOKEN` (fallback auth path)

**Symptom.** `pnpm publish` exits non-zero with `E401`, `EAUTH`, `EUNAUTHORIZED`, `E403`, or `EFORBIDDEN`. The workflow is using the `NODE_AUTH_TOKEN` (sourced from `NPM_TOKEN` secret) fallback path because Trusted Publishing handed off — usually because OIDC isn't configured for that specific package, or the OIDC token was rejected.

**State check.** On npm, verify the token at `https://www.npmjs.com/settings/<username>/tokens` — is it expired? Was it revoked? Is the package in scope for that token?

**Recovery.**

1. Generate a new **Automation** token (not Publish, not Read-only) on npm with publish rights for `@youversion/*`. **The token type matters** — see #5.
2. Update the `NPM_TOKEN` repo secret at `https://github.com/youversion/platform-sdk-react/settings/secrets/actions`.
3. Re-run the workflow.

> **Better long-term fix:** configure Trusted Publishing on the failing package(s) so this repo doesn't need `NPM_TOKEN` at all. See [PUBLISHING.md](./PUBLISHING.md#setting-up-trusted-publishing).

**Expected end state.** All three packages at `$VERSION` on npm.

---

## 5. OTP / 2FA error class (wrong token type)

**Symptom.** `pnpm publish` exits non-zero with `EOTP`, `need a one-time password`, `OTP required`, or similar. The token in use is a **Publish** token or a personal user token, not an **Automation** token — npm is requiring a 2FA OTP on every publish call.

**Why it happens.** Automation tokens explicitly bypass 2FA-on-publish for CI use. Publish tokens require 2FA on every publish. Personal user tokens require 2FA if the npm account has 2FA enabled (which it should). CI cannot prompt for an OTP, so the publish fails immediately.

**State check.** Error message is unambiguous — no further checks needed.

**Recovery.**

1. On `https://www.npmjs.com/settings/<user>/tokens`, generate an **Automation** token with publish rights for `@youversion/*`. The token type is the picker at the top of the new-token form — pick **Automation**, not **Publish**, not **Read and publish**.
2. Replace the `NPM_TOKEN` repo secret.
3. Re-run the workflow.

> **Token-type cheat sheet:** Automation = bypass 2FA, CI-safe. Publish = require 2FA, manual use only. Read-only = read public packages, no publish.

**Expected end state.** All three packages at `$VERSION` on npm.

---

## 6. `workspace:*` not rewritten in published tarballs

**Symptom.** Consumers install `@youversion/platform-react-ui@$VERSION` (or `…-react-hooks@$VERSION`) and see `Cannot resolve workspace:* outside a workspace` or `Unsupported URL Type "workspace:": workspace:*` in install logs.

**Why it happens.** `pnpm publish` (invoked by `changeset publish`) rewrites `workspace:*` to a real version range at pack time. If a publish ran through a non-pnpm tool, or `publishConfig` was edited in a way pnpm doesn't recognize, the literal `workspace:*` reference can ship.

**State check.** The dependency graph: `…-react-ui` depends on `…-core` AND `…-react-hooks`; `…-react-hooks` depends on `…-core`. Inspect any published tarball:

```bash
mkdir -p /tmp/inspect-ui && cd /tmp/inspect-ui
npm pack "@youversion/platform-react-ui@$VERSION"
tar -xzf youversion-platform-react-ui-${VERSION}.tgz
node -p "require('./package/package.json').dependencies"
```

The `…-core` and `…-react-hooks` deps should be `^$VERSION` (or `~$VERSION`), not `workspace:*`.

**Recovery.** If a published tarball is broken:

1. Deprecate it: `npm deprecate @youversion/platform-react-ui@$VERSION "broken workspace:* — use ${NEXT_VERSION}"`.
2. Land a fix on `main` (usually a `publishConfig` cleanup), add a Changeset, and let the normal release flow ship a patch.

**Why not unpublish?** npm's 72-hour unpublish window has historically been narrowed; prefer deprecation + a patch release.

---

## 7. Peer-dep version skew with consumer projects

**Symptom.** Consumers report install errors like `incorrect peer dependency` or runtime errors after upgrading. Their `react` / `react-dom` doesn't satisfy the SDK's `peerDependencies` range. Typical signatures: hooks fail with "Invalid hook call" when React major versions mismatch; SSR output diverges when `react-dom` is on a different minor than what the SDK was built against.

**State check.**

```bash
npm view "@youversion/platform-react-ui@${VERSION}" peerDependencies
npm view "@youversion/platform-react-hooks@${VERSION}" peerDependencies
npm view "@youversion/platform-core@${VERSION}" peerDependencies
```

Cross-reference with the consumer's `package.json`.

**Recovery — two options:**

- **Consumer upgrades.** Document required peer ranges in the Changeset body / GitHub release notes. Consumers update `react` / `react-dom` to a satisfying version.
- **SDK widens the range.** If a swath of consumers is affected and the SDK *would actually work* with the older peer, ship a patch widening `peerDependencies`. Be conservative — widening too far papers over a real incompatibility (e.g. an actual React 19-only API the SDK depends on) and produces opaque runtime errors instead of install errors.

**Prevention.** When bumping a major peer range (`react >=18` → `react >=19`), describe the consumer impact in the Changeset body. The Changeset becomes part of the release notes consumers read before upgrading.

---

## 8. Dist-tag drift (next / beta channels)

**Symptom.** A pre-release shipped to `latest` instead of `next` / `beta`, breaking consumers on the stable channel. Or: a stable release landed on `next` and the pre-release channel now points at a stable version.

**Why it happens.** Changesets-action publishes to `latest` by default. Pre-release mode is controlled by `pnpm changeset pre enter <tag>` / `pnpm changeset pre exit`, which writes `.changeset/pre.json`. If the pre-mode state file is missing or stale when a release runs, the dist-tag is wrong.

**State check.**

```bash
npm view "@youversion/platform-react-ui" dist-tags
cat .changeset/pre.json 2>/dev/null || echo "not in pre-release mode"
```

**Recovery.**

```bash
# Move latest off the bad version
npm dist-tag add @youversion/platform-react-ui@<good-version> latest

# Point next at the right pre-release
npm dist-tag add @youversion/platform-react-ui@<prerelease-version> next
```

Repeat for `…-react-hooks` and `…-core`.

**Prevention.** Before opening a release that should hit `next`, confirm `.changeset/pre.json` exists and references the right tag. After the pre-release window, run `pnpm changeset pre exit` and commit the deletion in the same PR that ships the first stable.

---

## 9. Rogue tag (tag on origin without a matching release / publish)

**Symptom.** A Changesets tag (`<pkg>@$VERSION`, e.g. `@youversion/platform-core@$VERSION`) exists on origin, but one or more of: the GitHub release is missing, the npm packages were never published, or the tag points at the wrong commit. Usually the tail of a run that died after the tag push but before (or during) publish — the inverse of #1, where the registry landed but the tags didn't.

**Why it happens.** Changesets-action pushes the version-bump commit and the per-package tags as part of merging the "Version Packages" PR, then publishes. If the job is killed between those steps, or a tag was pushed by hand during a manual recovery, a tag can outlive the work it was supposed to mark. Note the tags are **per package** — not a single bare `$VERSION` — so a partial failure can leave some package tags present and others missing.

**State check.**

```bash
# What does origin have, where does each tag point, and is each version on npm?
for p in @youversion/platform-core @youversion/platform-react-hooks @youversion/platform-react-ui; do
  tag="${p}@${VERSION}"
  echo "== ${tag} =="
  git ls-remote origin "refs/tags/${tag}" || echo "  no tag on origin"
  git rev-parse "${tag}^{commit}" 2>/dev/null || echo "  not fetched locally"
  gh release view "${tag}" >/dev/null 2>&1 && echo "  release exists" || echo "  no release"
  npm view "${tag}" version 2>/dev/null || echo "  NOT on npm"
done
```

**Recovery.**

- **Tag is correct, but release / publish are missing.** Leave the tag. Re-run the release workflow — `changesets/action` will publish the packages that aren't on the registry yet. If a GitHub release is still missing afterward, create it from the tag: `gh release create "<pkg>@$VERSION" --notes-file <changesets-body>`.
- **A tag points at the wrong commit, or was pushed for a version that should never have shipped.** Delete that package's tag on both sides, then let the normal flow re-create it:
  ```bash
  tag="@youversion/platform-core@${VERSION}"   # repeat per affected package
  git push origin ":refs/tags/${tag}"          # delete remote tag
  git tag -d "${tag}"                          # delete local tag
  ```
  Only delete a tag if that package's version is **not** on npm. If npm already has `<pkg>@$VERSION`, deleting the tag desyncs git from the registry — instead, re-point the tag at the published commit and keep it.

**Expected end state.** For every package: either the tag is deleted (because that version never shipped) or it points at the published commit and has a matching GitHub release + npm version.

---

## 10. Wrong version input (bad bump in the "Version Packages" PR)

**Symptom.** The "Version Packages" PR proposes a version that's wrong — a major bump for a patch-only change, a skipped number, or a downgrade. There is no manual `VERSION` field in this repo (unlike the Swift orchestrator); the version is computed by Changesets from the `.changeset/*.md` files' declared bump levels.

**Why it happens.** A changeset declared the wrong bump level (`major` where `patch` was meant, or vice versa), or multiple changesets stacked to a larger bump than intended.

**State check.** Read the proposed bump before merging:

```bash
gh pr view --json title,files | jq .          # the "chore: version packages" PR
cat .changeset/*.md                            # the bump levels feeding the computed version
```

The version in the PR's `package.json` diffs is the version that will publish the moment you merge.

**Recovery (before merge — the safe path).**

1. **Do not merge the "Version Packages" PR.** Close it, or leave it open.
2. Fix the bump at the source on `main`: edit or delete the offending `.changeset/*.md` entry (the front-matter line like `'@youversion/platform-react-ui': minor`).
3. Push to `main`. Changesets-action regenerates the "Version Packages" PR with the corrected version.

**Recovery (after merge — already published).** npm publish is not reversible (see #1 / #6). If a wrong version already shipped:

- **Too-high version (e.g. an accidental major).** You can't reclaim the number. Accept it, deprecate if it's confusing (`npm deprecate …`), and continue from there — SemVer only requires monotonic increase, not contiguity.
- **Broken release.** Deprecate it and ship a corrected patch via the normal flow (see #6).

**Prevention.** Treat the "Version Packages" PR as the version approval gate — review the computed version in its diff before merging. This is also the **breaking-change approval point**: a `major` bump only ships when a human merges that PR, so a reviewer can block a `major` there. See the breaking-change note in [`docs/release-hardening-plan.md`](./docs/release-hardening-plan.md#breaking-change-approval).

**Expected end state.** The intended version (and no other) is on npm with a matching tag and GitHub release.

---

## When something isn't here

These docs are deliberately limited to failure modes that aren't already handled by Changesets-action's normal behavior. Generic publish issues (missing changeset, "Version Packages" PR didn't appear, npm scope misconfigured) are covered in [PUBLISHING.md](./PUBLISHING.md). If you hit something not in either place, capture the symptom + recovery in a PR adding a new section here so the next operator doesn't start cold.
