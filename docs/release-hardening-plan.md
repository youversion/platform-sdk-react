# Release Hardening Plan (YPE-2486)

## Why this doc exists

YPE-2486 was opened to port [`platform-sdk-swift`'s YPE-2684 release hardening](https://github.com/youversion/platform-sdk-swift) to the React SDK. The Swift hardening was built around a custom bash orchestrator (`scripts/release.sh`) with explicit version inputs, tag-state resume mode, and bounded retry on `pod trunk push`.

The React SDK does not use that shape — it uses [Changesets](https://github.com/changesets/changesets) with `changesets/action@v1`, triggered on push to `main`. Most of YPE-2486's "Constant across SDKs" scope assumes the bash-orchestrator model and is structurally inapplicable here; the one registry-agnostic item that *does* apply — commit-lint (AC6) — was ported from the Kotlin SDK. This document records what the team decided to do instead.

The sibling RN-Expo SDK ([`platform-sdk-reactnative-expo`](https://github.com/youversion/platform-sdk-reactnative-expo)) made the same call — see its [`docs/release-hardening-plan.md`](https://github.com/youversion/platform-sdk-reactnative-expo/blob/main/docs/release-hardening-plan.md) for the parallel pivot.

## Decision: keep Changesets, harden around the edges

Three options were on the table:

1. **Adopt the Swift model.** Replace Changesets with a `workflow_dispatch`-triggered bash orchestrator that takes a `version` input and implements resume mode, bounded retry, and per-package idempotency. Faithful to the Swift hardening, but rips out a working release model and introduces ~1000 LoC of bash to maintain.
2. **Keep Changesets, layer Swift-style hardening on top.** Add `npm view` pre-publish checks, `EPUBLISHCONFLICT` handling, and retry logic inside the workflow alongside `changesets/action`. Higher complexity than option 3 with marginal upside — Changesets already handles most of these cases.
3. **Keep Changesets, document the failure surface, and accept what's already idempotent.** Land the failure-mode runbook and engineering plan called for by YPE-2486 ACs 4 / 5 / 7, port the registry-agnostic items that *do* apply (commit-lint, AC6), document the breaking-change gate, drop the AC items that conflict with Changesets, and update the ticket scope to match.

**Option 3 was chosen.** Changesets-action already:

- Re-reads the registry per package before publishing, so a retry skips packages that landed.
- Treats publishing as atomic per package (one tarball uploads or none does — no partial-package state).
- Re-runs cleanly on workflow retry: if the "Version Packages" PR didn't merge yet, the next run regenerates it; if the publish failed mid-way, the next run picks up the missing packages.

The hardening Swift needed (tag-resume, bounded retry, per-package idempotency) is mostly built in for free here. What's actually missing is **documentation** — operators need to know how to map an npm error message to a recovery, what failure classes are transient vs hard, and what an Automation token vs Publish token means for CI.

## What landed under YPE-2486

| AC | Deliverable | Status |
| --- | --- | --- |
| 4 | `RELEASE-RUNBOOK.md` with 10 failure modes: EPUBLISHCONFLICT-after-success, transient 5xx, provenance attestation failure, expired NPM_TOKEN, OTP/2FA, workspace:* rewrite, peer-dep skew, dist-tag drift, rogue tag, wrong version input | ✅ Landed (all AC4-named modes covered: registry transient, EPUBLISHCONFLICT-after-success, provenance, NPM_TOKEN, OTP/2FA, rogue tag, wrong VERSION input) |
| 5 | Operator guide: `PUBLISHING.md` retained, cross-links runbook | ✅ Landed (cross-link added) |
| 6 | Commit-lint workflow anchored at `origin/main` tip, ignores the release commit | ✅ Landed (ported from the Kotlin SDK) |
| 7 | This engineering plan | ✅ This document |
| BREAKING CHANGE requires manual approval | The "Version Packages" PR merge is the approval gate | ✅ Documented below |

## What was dropped from scope (and why)

| Original AC item | Why dropped |
| --- | --- |
| 1. Manual `workflow_dispatch` with explicit version input | Conflicts with Changesets' auto-on-merge model. Versions come from `.changeset/*.md` files, not workflow inputs. Operator override is done by hand-editing the "Version Packages" PR before merging. |
| 2. Resume-on-re-dispatch in a custom script | `changesets/action` is idempotent by design — re-running it from the Actions tab is the recovery path. No custom resume logic needed. |
| 3. Custom `npm view` idempotency check + EPUBLISHCONFLICT handling | Changesets-action does per-package registry checks before publishing. EPUBLISHCONFLICT-after-success is documented in the runbook so operators recognize the symptom; no in-band classifier needed. |
| Bounded retry on registry-publish | Not supported by `changesets/action` upstream. Workflow re-trigger from Actions UI fills the gap. |
| Dist-tag preservation in resume mode | Changesets handles dist-tag via `.changeset/pre.json`; #8 in the runbook covers the manual recovery if it drifts. |

These items aren't impossible to add; they just don't pull their weight against the Changesets baseline. If the release model ever pivots (e.g. to manual-dispatch for slow-rolling enterprise channels), they should be re-evaluated.

## Commit linting (AC6)

Ported from the Kotlin SDK's working setup ([`commitlint.yml`](https://github.com/youversion/platform-sdk-kotlin/blob/main/.github/workflows/commitlint.yml) + [`commitlint.config.js`](https://github.com/youversion/platform-sdk-kotlin/blob/main/commitlint.config.js)), which is the reference this AC was modeled on:

- **CI** — [`.github/workflows/commitlint.yml`](../.github/workflows/commitlint.yml) runs on PRs and anchors the lint range at the **merge-base with the live `origin/main`** (`git fetch origin main` full history → `base=$(git merge-base origin/main <head.sha>)` → `commitlint --from <base> --to <head.sha>`), not the PR's recorded base SHA. The recorded base goes stale as `main` advances and would re-lint already-merged commits; the merge-base lints only commits new to the branch, and stays correct even when the branch is behind main. Note: `main` must be fetched with full history — a shallow (`--depth=1`) fetch hides the merge-base and balloons the range to include unrelated historical commits.
- **Local** — a husky `commit-msg` hook ([`.husky/commit-msg`](../.husky/commit-msg)) runs `commitlint --edit` so authors catch a bad message at commit time, before pushing.
- **Config** — [`commitlint.config.js`](../commitlint.config.js) extends `@commitlint/config-conventional`.

Two React-specific deltas from the Kotlin original:

- **Release-commit ignore.** Kotlin (semantic-release) ignores `chore(release):`. This repo (Changesets) emits `chore: version packages` — the config ignores that subject instead, so the release bot's own commit never fails the lint range on a workflow re-run.
- **No ticket prefix in commit subjects.** Plain `@commitlint/config-conventional` — no custom `headerPattern`. Ticket references (YPE-1234) live in the branch name and PR body, not the commit subject. GitHub-generated Greptile suggestion commits (`Update <path>` / `Apply suggestions from code review` with a `Co-authored-by: greptile-apps[bot]` trailer) are ignored; see `docs/adr/0007-github-suggestion-commits-bypass-commitlint.md`.

## BREAKING CHANGE approval

The ticket requires that a breaking change can't ship without manual approval. In the Changesets model this gate already exists and is structural — there is no separate workflow to add:

- A breaking change is declared as a `major` bump in its `.changeset/*.md` entry.
- That bump flows into the **"Version Packages" PR**, where the new `major` version is visible in the `package.json` diffs.
- Nothing publishes until a human **merges that PR**. The merge is the manual approval — a reviewer can block a `major` bump there, or send it back to correct the bump level before anything reaches npm.

So the approval point for breaking changes is the same review-and-merge step every release passes through; no auto-publish path bypasses it (the workflow only publishes *after* the version PR merges to `main`). Recovery for a wrong bump that slips through is in [`RELEASE-RUNBOOK.md` §10](../RELEASE-RUNBOOK.md#10-wrong-version-input-bad-bump-in-the-version-packages-pr).

## What's *not* in this PR but worth knowing

- **Trusted Publishing** is configured for all three packages (`@youversion/platform-core`, `…-react-hooks`, `…-react-ui`) — see [`PUBLISHING.md`](../PUBLISHING.md). `NPM_TOKEN` is kept as a fallback only.
- **Provenance** is on by default (`publishConfig.provenance: true` in each package + `NPM_CONFIG_PROVENANCE: true` in [`release.yml`](../.github/workflows/release.yml)).
- **Three-package fixed group** in [`.changeset/config.json`](../.changeset/config.json) ensures every release ships all three packages at the same version.
- **The RN SDK matches this same shape** so contributors and maintainers don't have to relearn the release flow per repo.

## Related work / cross-references

- [`platform-sdk-reactnative-expo`'s YPE-2790](https://github.com/youversion/platform-sdk-reactnative-expo) — parallel pivot on the RN repo, same Changesets model, slim runbook with RN-specific failure modes.
- [`platform-sdk-swift`'s YPE-2684](https://github.com/youversion/platform-sdk-swift) — original Swift hardening; the React SDK does not adopt its orchestrator shape but borrows its failure-class taxonomy.
- [`changesets/action`](https://github.com/changesets/action) — upstream action behavior.
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) — the OIDC auth path used here.
