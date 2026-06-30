# Release Hardening — Open Decisions (YPE-2486)

**Status:** 🟡 Blocked. [PR #268](https://github.com/youversion/platform-sdk-react/pull/268) does not land until the decisions below are made. Some need @davidfedor.

Review feedback (jhampton, `CHANGES_REQUESTED`, 2026-06-29) raised three items that are **decisions, not bugs**. Decide each deliberately, then pin it two ways:

- **Deterministic** — code/config (`commitlint.config.js`, workflows, `package.json`, hooks).
- **Semi-deterministic** — [`.greptile/rules.md`](https://www.greptile.com/docs/code-review/custom-standards), `AGENTS.md`.

Update each decision's status as it lands.

---

## Decision 1 — Commit-lint subject model 🔴

**Problem.** [`commitlint.config.js`](../commitlint.config.js) allows a leading `YPE-####` prefix, then enforces strict conventional. Wrong assumption: external contributors don't open PRs with a ticket number (it's added to the PR title later), and much of the repo's own history fails strict conventional anyway (e.g. `YPE-1146 - Prep React SDK...`, `Add Language detection...`).

**Options.**
1. **Lint the PR title, not commits** (squash-merge makes the title the commit). Ticket can be added to the title post-acceptance; contributors aren't blocked mid-branch.
2. **Keep per-commit linting, relaxed** — drop the prefix parser, loosen `subject-case`.
3. **Strict per-commit as-is** — most consistent, most friction, contradicts "ticket added later."

**Recommend:** Option 1. **Decides:** @davidfedor.
**Pin:** PR-title lint job in `commitlint.yml`; drop/trim the parser in `commitlint.config.js`; note the convention in `.greptile/rules.md` + `AGENTS.md`.

---

## Decision 2 — Package-manager lane 🔴

**Problem.** The [`commit-msg`](../.husky/commit-msg) hook runs bare `pnpm exec` — uses whatever pnpm is on PATH, not the pinned `pnpm@9.0.0`. A newer global pnpm fails commits. The repo also never states/enforces that it's a pnpm workspace.

**Options.**
1. **pnpm + Corepack** — `corepack pnpm exec` in hooks (activates the pinned version); README rationale; optional CI guard.
2. **pnpm, no Corepack** — document it, rely on `engines`/`packageManager`; mismatch can still bite locally.
3. **Pure node** — not viable; the repo uses `workspace:*` (pnpm-only).

**Recommend:** Option 1. **Decides:** @davidfedor (approve README rationale).
**Pin:** `corepack pnpm exec` in hooks + optional CI check; README "Package Manager" section; `.greptile/rules.md` flag for bare `pnpm exec` in hooks.

---

## Decision 3 — Node-version policy 🟠

**Problem.** Versions are inconsistent: CI/commitlint on Node 20, release on Node 24, `engines.node >=20`. The commitlint break is already fixed (pinned to v19, Node ≥18, commit `98a3a86`) but there's no stated policy.

**Options.**
1. **Standardize on Node 20** across CI/hooks; new dev-deps must support it.
2. **Raise floor to Node 22** — bigger blast radius (consumers, contributors).
3. **Per-workflow, documented** — allow release to differ, write down why.

**Recommend:** Option 1. **Decides:** team.
**Pin:** align `node-version` across `ci.yml`/`commitlint.yml`/`release.yml`; `AGENTS.md` note "new dev-deps must support `engines.node`."

---

## Already fixed (no decision)

| Item | Fix |
| --- | --- |
| commitlint `@21` needs Node ≥22.12 | Pinned to `19.8.1` — `98a3a86` |
| Runbook used bare `$VERSION` tag; repo tags per-package | §1/§9 loop over `<pkg>@$VERSION` — `5f56a0d` |
| Release-ignore regex too broad | Anchored to `(?:\r?\n\|$)` — `5f56a0d` |
| Commit-lint range too wide (shallow fetch) | `git merge-base origin/main HEAD` + full fetch — `6ab6118` |

## Next

1. Decide 1–3 (consult @davidfedor).
2. Implement deterministic guardrails.
3. Add `.greptile/rules.md` + `AGENTS.md` rules.
4. Update [`release-hardening-plan.md`](./release-hardening-plan.md), then unblock PR #268.
