# 3. The Locale Ownership gate keys on PR author, not branch name

Date: 2026-07-29

## Status

Accepted

## Context

Locale JSON under `packages/ui/src/i18n/locales/` is owned upstream in
**platform-localization** and delivered here by an automated sync PR. The
`locale-ownership` CI job (`.github/scripts/check-locale-ownership.sh`) exists to
stop a contributor from hand-editing those files, since any local edit is
silently overwritten by the next sync.

The gate is allowlist-first: recognize the sync PR and exit 0, otherwise diff the
locale directory across the merge base and fail on any change. As originally
written (`833aa47`, 2026-07-17) the allowlist was an **AND** of two conditions:

```bash
is_sync_bot_author() { [[ "$PR_AUTHOR" == "$LOCALIZATION_SYNC_BOT_USER" ]]; }
is_sync_branch()     { [[ "$HEAD_REF" =~ ^chore/localization-sync-react- ]]; }
is_allowed_sync_pr() { is_sync_bot_author && is_sync_branch; }
```

The branch regex described what upstream produced at that moment:
`chore/localization-sync-react-<yyyymmdd>-<sha7>`. On 2026-07-28,
`platform-localization` landed `1facc47` ("fix: dup PR from work flows"), which
replaced the timestamped branch expression with a fixed constant,
`SYNC_BRANCH: chore/localization-sync-react`. That change is deliberate and
correct upstream: a constant branch name makes
`peter-evans/create-pull-request@v7` reuse the branch and update the existing PR
instead of opening a duplicate on every run. It is not a bug to revert there.

Downstream, the literal `chore/localization-sync-react` is a strict prefix of the
regex rather than a match for it — the trailing hyphen is required. The author
half still matched; the branch half could never match again.
[PR #306](https://github.com/youversion/platform-sdk-react/pull/306) was the
first casualty: seven checks green, `Locale Ownership` red, with
`PR_AUTHOR: platform-localization-pr-bot[bot]` and
`HEAD_REF: chore/localization-sync-react` printed side by side in the job log.
Korean, Turkish, and Chinese bundles sat in an unmergeable PR, and every
subsequent sync would have failed the same way, silently.

## Decision

Allow a sync PR on **PR author alone**:

```bash
is_allowed_sync_pr() {
  [[ "$PR_AUTHOR" == "$LOCALIZATION_SYNC_BOT_USER" ]]
}
```

`PR_AUTHOR` is `github.event.pull_request.user.login`, which renders a GitHub App
as `<slug>[bot]` — here, exactly `platform-localization-pr-bot[bot]`. The check is
string equality, not a prefix or substring match, so a lookalike login does not
pass.

`HEAD_REF` remains a script input and remains in the skip log line. It is useful
context when reading a job log; it is no longer part of the decision.

The failure path now prints the observed author and branch alongside the expected
author, so the next mismatch is diagnosable from the log without reading the
script.

## Why the branch check was removed rather than loosened

Loosening the regex to `^chore/localization-sync-react` would have unblocked #306
with a one-character diff and rearmed the identical landmine for the next
upstream rename. The branch name is worth nothing as a signal:

- It is chosen by the same automation whose identity the author check already
  verifies. Anyone able to open a PR as the App could name the branch whatever
  the gate demanded. It adds no forgery resistance.
- It is a string constant duplicated across two repositories with no shared
  definition, no test spanning both, and no mechanism that fails loudly when one
  side moves. That coupling is the failure mechanism, not a hardening measure.

Removing it eliminates the failure mode instead of postponing it. The only
remaining cross-repo constant is the App login, which changes only if the App
itself is renamed.

## Scope of the guarantee

This gate is a guardrail against accidental hand-edits. It is **not** a security
control, and it should not be hardened as though it were. For `pull_request`
events GitHub checks out the workflow and this script from the PR's merge ref, so
a pull request can edit the gate that judges it. Any defense against a
compromised upstream App belongs at the permission layer (branch protection,
CODEOWNERS, required reviews), not inside a script the PR controls.

Stated plainly here because the most likely way this decision gets reverted is a
future reviewer reading the removal as a weakening and reaching for the wrong
layer.

## Why this differs from the sibling SDKs

The three downstream SDKs enforce locale ownership differently, and they stay
divergent after this change.

`platform-sdk-reactnative-expo` runs a Node guard
(`scripts/check-locale-parity.mjs --guard`) whose `isSyncPullRequest()` is an
**OR** of three independent signals: actor in an allowlist, a
`localization-sync` label, or a matching commit-message pattern. It has never had
a branch check. That shape is looser than what we adopt here — a matching commit
message alone is sufficient there — but it also means it could not have exhibited
this failure.

`platform-sdk-swift` has no gate at all; its sync commits are historically
human-authored.

`platform-sdk-react` was the only one of the three reading `head.ref`, which is
why it was the only one that broke. Aligning all three on one predicate is worth
doing, but it is a separate decision and not something to attach to an outage
fix.

## Consequences

- A PR authored by `platform-localization-pr-bot[bot]` skips the gate entirely,
  for any file it touches — not just locale JSON. Accepted: path-scoping the
  bot's allowance would reintroduce a false-failure surface the moment upstream
  adds a file to the sync PR, which is exactly the failure mode being eliminated.
  Worth revisiting as a deliberate hardening pass with its own threat model.
- `github-actions[bot]` is deliberately **not** a second allowed author. One App,
  one constant. Adding it would let the Changesets release PR — or any
  Actions-authored PR — edit locale JSON.
- The gate now has a test suite (`.github/scripts/check-locale-ownership.test.sh`,
  `pnpm test:ci-scripts`) that runs in the `locale-ownership` job **before** the
  gate itself, so a regression in the predicate fails CI instead of waving PRs
  through. It pins this incident as a named case: bot author plus unsuffixed
  branch must exit 0.
- No monitoring is added for a silent recurrence. Accepted gap — with the branch
  coupling gone the surface is one string, and the suite covers a regression in
  the predicate.
