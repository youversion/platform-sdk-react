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
// This repo is ESM ("type": "module"), so the config uses `export default`.
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    (message) => /^chore: version packages(?:\r?\n|$)/i.test(message),
    // Merge commits are auto-generated and not authored conventional commits.
    (message) => message.startsWith('Merge '),
  ],
  rules: {
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
};
