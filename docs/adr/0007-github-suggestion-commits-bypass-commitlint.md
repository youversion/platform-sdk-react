# 7. GitHub suggestion commits are exempt from per-commit commitlint

Date: 2026-09-02

## Status

Accepted

## Context

Accepting a Greptile review suggestion through GitHub's "Commit suggestion"
button — labelled "Sign off and commit suggestion" here, because this repo's
history carries DCO `Signed-off-by:` trailers — produces a commit whose subject
GitHub writes, not Greptile: `Update <path>` for one suggestion, `Apply
suggestions from code review` for a batch. `.github/workflows/commitlint.yml`
lints every commit on the branch, so the PR goes red and the author has to amend
or rebase a commit that squash-merge is going to discard anyway. Commit
`8bb090bb` ("Update .changeset/remove-deprecated-apis.md", co-authored by
greptile-apps[bot]) is the recorded instance.

YPE-2550 proposed configuring Greptile to emit conventional commit messages.
Greptile cannot do that. It supplies only the ```suggestion diff block inside a
review comment; the commit message belongs to GitHub's UI. The full greptile.json
parameter list has no commitMessage, commitConvention, or sign-off key, and the
`.greptile/` folder format adds none.

## Decision

Ignore GitHub-generated suggestion commits in `commitlint.config.js`, matching on
both a GitHub default subject and a `Co-authored-by: greptile-apps[bot]` trailer.
Keep `.github/workflows/commitlint.yml` and `.github/workflows/pr-title.yml`
unchanged. Do not disable DCO sign-off. Do not disable Greptile inline comments.

## Why

We squash-merge, so the commit that lands on main is the PR title, already gated
by pr-title.yml (Decision 1). A blocking gate on a commit that will be thrown
away buys nothing and costs a rebase. Requiring both the subject shape and the
bot co-author trailer keeps the exemption narrow: this repo's history contains
human commits like "Update bible reader toolbar styling and variants", and those
must keep failing. The config already ignores the Changesets release commit and
merge commits, so this is the established mechanism, not a new one.

## Alternatives considered

Dropping the per-commit CI job and relying on the PR-title gate alone is a
defensible reading of Decision 1 and would remove this whole class of problem,
but it reverses a ruling made by jhampton and concurred by davidfedor, and drops
the cross-SDK parity with the Kotlin SDK's commitlint workflow that AC6 was
modelled on. That is a team call, not a 0.5-point ticket. Setting
`updateSummaryOnly: true` in greptile.json would stop suggestions at the source
but gives up inline review comments, which are the reason we run Greptile.
Documentation alone — edit the message field before clicking — works but depends
on discipline at the exact moment the developer is optimising for speed.

## Consequences

A commit whose subject starts with "Update " AND carries the greptile-apps[bot]
co-author trailer is not commit-linted. Human commits, agent co-authored commits
(Claude, Amp), and human-reviewer suggestion commits are unaffected and still
fail. If Greptile's bot account is ever renamed, the predicate stops matching and
the foot gun returns — the failure is loud (red CI), not silent. If GitHub
changes its default suggestion subject, the same applies. If the team later adopts
merge-commit or rebase-merge for any branch, these commits would reach main
unlinted; revisit this ADR at that point.

## Follow-ups

- Update YPE-2550 to record that the original acceptance criterion is not
  achievable as written, and what replaced it.
- Optional, separate: raise the "per-commit CI job vs. PR-title-only" question
  with the team as a follow-on to Decision 1.
