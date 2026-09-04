// Commit message linting for the React SDK.
//
// We squash-merge, so the landing commit on main is the PR title. The real
// gate is the PR-title lint job (.github/workflows/pr-title.yml); this
// per-commit config stays as an optional local dev aid via the husky
// commit-msg hook. See docs/release-hardening-decisions.md (Decision 1).
//
// Titles are plain Conventional Commits — no ticket prefix. Ticket references
// (YPE-1234) live in the branch name and PR body, not the title.
//
// The Changesets release commit subject is "chore: version packages" (see
// .github/workflows/release.yml); we ignore it so the bot's own commit never
// fails the lint range on a workflow re-run.
//
// GitHub's "Commit suggestion" button — labelled "Sign off and commit
// suggestion" on this repo because our history carries DCO trailers — writes
// the commit message itself, defaulting to `Update <path>` for a single
// suggestion and `Apply suggestions from code review` for a batch. Greptile
// only supplies the ```suggestion block; greptile.json has no commit-message
// setting (see docs/adr/0007-...). We squash-merge, so these commits never
// reach main — the landing commit is the PR title, gated separately by
// .github/workflows/pr-title.yml. Skip them rather than force an amend.
//
// Both halves are required: the greptile-apps[bot] co-author trailer is what
// distinguishes the bot flow from a human commit that merely starts with
// "Update" (this repo's history has several of those, and they should keep
// failing).
const isGreptileSuggestionCommit = (message) =>
  /^Co-authored-by: greptile-apps\[bot\]/im.test(message) &&
  (/^Update [^\n]+(?:\r?\n|$)/.test(message) ||
    /^Apply suggestions from code review(?:\r?\n|$)/.test(message));

// This repo is ESM ("type": "module"), so the config uses `export default`.
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    (message) => /^chore: version packages(?:\r?\n|$)/i.test(message),
    // Merge commits are auto-generated and not authored conventional commits.
    (message) => message.startsWith('Merge '),
    isGreptileSuggestionCommit,
  ],
  rules: {
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
};
