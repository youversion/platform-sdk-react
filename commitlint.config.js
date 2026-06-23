// Commit message linting for the React SDK.
//
// Ported from platform-sdk-kotlin's working setup, with two React-specific
// adaptations:
//
//   1. The release commit. Kotlin uses semantic-release, whose bot emits
//      "chore(release): ...". This repo uses Changesets, whose release commit
//      subject is "chore: version packages" (see .github/workflows/release.yml).
//      We ignore that subject so the bot's own commit never fails the lint
//      range on a workflow re-run.
//
//   2. The ticket prefix. About half of this repo's history leads with a
//      YouVersion ticket id, e.g. "YPE-1234: feat(ui): ..." or
//      "YPE-1234 - feat(ui): ...". We allow an optional leading ticket
//      reference before the conventional type/scope/subject so the team's
//      existing convention keeps passing.
//
// This repo is ESM ("type": "module"), so the config uses `export default`
// rather than Kotlin's `module.exports`.
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => /^chore: version packages/i.test(message)],
  parserPreset: {
    parserOpts: {
      // Optional "YPE-1234: " or "YPE-1234 - " prefix, then the standard
      // conventional header. Capture groups after the optional prefix must stay
      // aligned with headerCorrespondence below.
      headerPattern: /^(?:YPE-\d+(?:: | - ))?(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/,
      headerCorrespondence: ['type', 'scope', 'breaking', 'subject'],
    },
  },
  rules: {
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
};
