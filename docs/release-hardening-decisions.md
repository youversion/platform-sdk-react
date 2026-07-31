# Release Hardening — Open Decisions (YPE-2486)

**Status:** 🟢 All decisions settled; guardrails implemented on [PR #268](https://github.com/youversion/platform-sdk-react/pull/268) — remaining work is merging current `main` and aligning to its pnpm 11 / Node 24 toolchain. Decisions 1 & 2 ruled by jhampton (2026-07-01), concurred by davidfedor (2026-07-14). Decision 3 was resolved by main's pnpm 11 upgrade — floor recorded at `>=22.13` (2026-07-20), superseding David's earlier keep-at-`>=20` ruling. Decision 4 (changeset-per-PR gate) added 2026-07-20 after a live release failure.

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

## Decision 3 — Node-version policy 🟢 Resolved by main (pnpm 11 upgrade; floor recorded at 22.13, 2026-07-20)

**Problem (original).** Versions were inconsistent: CI/commitlint on Node 20, release on Node 24, `engines.node >=20`, with no stated policy.

**What changed.** While this branch was open, `main` upgraded to **pnpm 11**, which requires **Node >=22.13**. As part of that upgrade main raised the published `engines.node` from `>=20` to `>=22.13`, moved the React overrides into `pnpm-workspace.yaml`, added a supply-chain cooldown (`minimumReleaseAge`), and standardized **CI on Node 24** across the board. The Node-20-vs-24 split this decision was originally about no longer exists.

**Outcome (recorded 2026-07-20).** Accept main's direction: **consumer floor is `engines.node >=22.13`**, toolchain is pnpm 11, CI is Node 24. This supersedes davidfedor's 2026-07-14 audience-split ruling ("keep the consumer floor at `>=20`") — the pnpm 11 upgrade is exactly the "good reason to require something new" he left the door open for, and reverting to `>=20` would mean giving up pnpm 11. We are not moving backwards for the sake of a pre-upgrade decision.

**Guardrail (retained, re-based to the new floor).** New dev-deps must support `engines.node >=22.13`, or the floor gets bumped **deliberately**, not silently. (The old `@commitlint/*@21`-needs-Node-≥22.12 break that motivated this is now moot on Node 24.)

**Implementation.**
- Deterministic: align the release-hardening branch to main — `engines.node >=22.13`, pnpm 11, Node 24 in CI; correct the earlier Node-20 workflow comments.
- Semi-deterministic: `AGENTS.md` + `greptile.json` — "new dev-deps must support `engines.node` (>=22.13); don't lower the floor to escape a dep constraint without a decision."

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
