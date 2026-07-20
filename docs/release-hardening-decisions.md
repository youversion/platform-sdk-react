# Release Hardening — Open Decisions (YPE-2486)

**Status:** 🟢 All three review decisions made — [PR #268](https://github.com/youversion/platform-sdk-react/pull/268) is unblocked; remaining work is implementing the guardrails. Decisions 1 & 2 ruled by jhampton (2026-07-01), concurred by davidfedor (2026-07-14); Decision 3 ruled by davidfedor (2026-07-14). Decision 4 (changeset-per-PR gate) added 2026-07-20 after a live release failure.

Review feedback (jhampton, `CHANGES_REQUESTED`, 2026-06-29) raised three items that are **decisions, not bugs**. Each gets pinned two ways once decided:

- **Deterministic** — code/config (`commitlint.config.js`, workflows, `package.json`, hooks).
- **Semi-deterministic** — [`greptile.json`](https://www.greptile.com/docs/code-review/custom-standards) (`customContext.rules`), `AGENTS.md`.

---

## Decision 1 — Commit-lint subject model 🟢 Decided (jhampton, 2026-07-01; davidfedor concurred 2026-07-14)

**Ruling.** Enforce conventional commits. Ticket refs live in **branch names** (Jira parses those) and the PR body — not the commit title. We squash-merge, so the **PR title is the landing commit** and must be conventional.

**Rationale — checked per jhampton's "check my math".** In the Swift SDK, conventional commits drive changelog + version math. **This repo does not work that way:**
- Changelog = `@changesets/cli/changelog`, generated from `.changeset/*.md` summaries.
- Version bump = the level declared in each changeset (`patch`/`minor`/`major`) + the fixed group.
- No semantic-release / conventional-changelog tooling.

So commit titles **don't** feed the changelog or version here — Changesets does. Enforcing conventional commits is still correct, but for **consistency, cross-SDK parity, and clean history** — not changelog/version correctness. Document it this way so no one later assumes commits drive the changelog.

**Implementation.**
- Deterministic: plain `@commitlint/config-conventional`; **remove** the `YPE-####` prefix parser from [`commitlint.config.js`](../commitlint.config.js); lint the **PR title** (becomes the squash commit, e.g. `amannn/action-semantic-pull-request`); keep the per-commit husky hook as an optional dev aid.
- Semi-deterministic: `greptile.json` + `AGENTS.md` — PR titles must be conventional; tickets belong in the branch name / PR body.

---

## Decision 2 — Package-manager lane 🟢 Decided (jhampton, 2026-07-01; davidfedor concurred 2026-07-14, deferring to the daily release dev)

**Ruling.** Option 1 — pnpm + Corepack. The lane is already pnpm (`workspace:*` is pnpm-only); enforce the pinned version and document why.

**Deferred knock-on.** Corepack is deprecated but supported **through Node 24**. The "what replaces Corepack" call is deferred until the ecosystem settles (Corepack team, Node/Bun/Deno); revisit before moving off Node 24 — file a follow-up ticket.

**Implementation.**
- Deterministic: `corepack pnpm exec` in [`.husky/`](../.husky) hooks; optional CI "verify package manager" step; keep `packageManager`/`engines` pins.
- Semi-deterministic: `README.md` "Package Manager" section (the rationale); `greptile.json` flag for bare `pnpm exec` in hooks.

---

## Decision 3 — Node-version policy 🟢 Decided (davidfedor, 2026-07-14)

**Problem.** Versions are inconsistent: CI/commitlint on Node 20, release on Node 24, `engines.node >=20`. The commitlint break is already fixed (pinned to v19, Node ≥18, commit `98a3a86`), but there's no stated policy. Note Decision 2 ties us to Corepack **through Node 24**.

**Ruling.** Split by audience instead of forcing one number (Option 3 — per-workflow + documented):
- **Consumers** (developers merely using the SDK): keep `engines.node` at `>=20` — support decently far back. Do **not** raise the floor; there's been no pushback, so no change until there's a concrete reason.
- **Contributors / CI**: a fairly-recent Node is fine. The existing split (CI/commitlint on 20, release on 24) stays; document *why* rather than standardizing everything to one version.

**Rationale.** Raising the consumer floor taxes SDK users for a contributor-side convenience. The split already works and is reversible (davidfedor: "not a one-way door").

**Guardrail (kept from the Option 1 analysis).** New dev-deps must support the consumer `engines.node` (`>=20`), or the floor gets bumped **deliberately**, not silently. This is exactly what bit us: `@commitlint/*@21` required Node ≥22.12 while CI ran 20 (fixed by down-pinning to `19.8.1`, `98a3a86`). Without the guardrail the next such dep silently reopens this.

**Implementation.**
- Deterministic: document the per-workflow Node versions in `release.yml`/`ci.yml`/`commitlint.yml` (comment the intent); keep `engines.node >=20`.
- Semi-deterministic: `AGENTS.md` + `greptile.json` — "new dev-deps must support `engines.node`; don't raise the consumer floor without a decision."

---

## Decision 4 — Enforce a changeset per PR 🟠 New (surfaced by the 2026-07-17 release failure)

**Incident.** [#282](https://github.com/youversion/platform-sdk-react/pull/282) (`chore: localization protection`, merged `833aa47`) landed with **no changeset**. With nothing to version, the [Release run](https://github.com/youversion/platform-sdk-react/actions/runs/29616967518) took the publish path and tried to re-publish the already-live 2.3.0 → `E403 — cannot publish over previously published versions: 2.3.0`. No release was lost and nothing on npm was corrupted, but the pipeline stays red until a fresh version ships. Fixed forward by [#292](https://github.com/youversion/platform-sdk-react/pull/292) (adds the missing changeset → 2.3.1).

**Root cause.** The changesets action branches on whether unconsumed `.changeset/*.md` files exist: present → open a "version packages" PR; absent → run publish. A PR merged without a changeset silently routes main into a no-op publish that collides on the current version. Note the trap: #282 was a `chore:` that still touched publishable `packages/ui` source, so it genuinely needed a release — "chore" is not a safe signal for "no changeset needed." This reinforces Decision 1's finding that **changesets are load-bearing** here (they drive changelog + version), so a missing one is a release break, not a style nit.

**Options.**
1. **CI hard gate** — a PR job running `pnpm changeset status --since=origin/main` that fails when no changeset is present; no-release PRs opt out deliberately with an empty changeset (`pnpm changeset --empty`).
2. **Changesets bot** — the GitHub app posts a comment + status check when a PR has no changeset (better UX, softer gate).
3. **Both** — bot for contributor UX, CI check as the enforced gate.

**Recommend:** Option 1 (deterministic hard gate); add the bot later for UX if wanted. **Decides:** team.
**Pin:** a "changeset required" job in the PR workflow; `greptile.json` + `AGENTS.md` note "every PR needs a changeset — use `pnpm changeset --empty` for genuine no-release changes (CI/docs/tooling)."

---

## Already fixed (no decision)

| Item | Fix |
| --- | --- |
| commitlint `@21` needs Node ≥22.12 | Pinned to `19.8.1` — `98a3a86` |
| Runbook used bare `$VERSION` tag; repo tags per-package | §1/§9 loop over `<pkg>@$VERSION` — `5f56a0d` |
| Release-ignore regex too broad | Anchored to `(?:\r?\n\|$)` — `5f56a0d` |
| Commit-lint range too wide (shallow fetch) | `git merge-base origin/main HEAD` + full fetch — `6ab6118` |

## Next

1. Implement deterministic guardrails for all three decisions (all decided — ready now).
2. Add the "changeset required" CI gate (Decision 4).
3. Add `greptile.json` + `AGENTS.md` rules.
4. File the Corepack-successor follow-up ticket (Decision 2).
5. Update [`release-hardening-plan.md`](./release-hardening-plan.md); PR #268 is unblocked — push the guardrail commits and take it out of draft.
