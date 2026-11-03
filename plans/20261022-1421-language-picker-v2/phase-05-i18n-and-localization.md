# Phase 05 — i18n and localization

## Context Links

- [plan.md](plan.md)
- [docs/i18n-guidelines.md](../../docs/i18n-guidelines.md)
- [AGENTS.md](../../AGENTS.md)
- [scout/scout-01-picker-codebase.md](scout/scout-01-picker-codebase.md)
- [research/researcher-01-figma-changelog.md](research/researcher-01-figma-changelog.md)

## Overview

Reuse keys. Change one English value upstream. Wire two unused keys. Do not edit locale JSON in this repo.

## Key Insights

- Canonical English is `platform-localization` `sources/common/en.json` under the `react.*` prefix. This repo receives JSON from the Distribute React Localization workflow. Authors must be `platform-localization-pr-bot`. A human edit to `packages/ui/src/i18n/locales/**` fails CI.
- `selectLanguageHeading` is `"Select a Language"`. Changelog title is "Bible Languages". Value-edit that key. Do not add `bibleLanguagesHeading`.
- After the edit, that key is the Languages list title only. Search view title is existing `searchLanguages` ("Search languages"), unused in TS today. Using the heading key for both would show "Bible Languages" twice.
- `language` ("Language") is unused. It is the versions-row label (phase 02).
- `languageSearchAriaLabel` and `searchPlaceholder` already label both search fields. Keep them.
- `clearSearch` stays unused. No clear button in the changelog.
- `selectLanguageAriaLabel` stays on the public `BibleVersionPickerLanguageTrigger`. The in-picker row uses visible `language` text instead. Do not change the trigger's aria string in localization.
- Tests that look for "Select a Language" stay true until the sync PR. Do not assert "Bible Languages" in this repo before `en.json` updates.

## Requirements

- UI calls `t('selectLanguageHeading')` for the Languages title (already does).
- UI calls `t('searchLanguages')` for the Search Languages title.
- UI calls `t('language')` for the versions entry label.
- Search field keeps `t('languageSearchAriaLabel')` and `t('searchPlaceholder')`.
- Version field keeps `t('versionSearchAriaLabel')` and `t('searchPlaceholder')`.
- No new keys.
- No edits under `packages/ui/src/i18n/locales/`.
- Parallel PR in platform-localization:
  - key `react.selectLanguageHeading`
  - value `Bible Languages`
  - `npm run generate && npm run validate`
- Translators update other locales via that repo. Do not paste translations into this repo.

## Architecture

Copy lives in components. This phase is a string-key checklist plus the upstream PR. It does not introduce an i18n wrapper.

Visible title lags the Figma string until sync. Ship the UI PR anyway. Mention the lag in the PR body and link the localization PR.

## Related Code Files

- `/Users/cameron/Code/localization/platform-sdk-react/docs/i18n-guidelines.md`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/i18n/locales/en.json` (read only)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/index.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/language-panel.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/version-list.tsx`
- platform-localization `sources/common/en.json` (other repo, `react.selectLanguageHeading`)

## Implementation Steps

1. Grep the picker folder. Languages title = `selectLanguageHeading`. Search title = `searchLanguages`. Row label = `language`. No raw "Bible Languages" or "Search languages" in JSX.
2. Open the localization repo. Change only that value. Generate and validate.
3. Open the localization PR. Link it from the UI PR.
4. When the bot sync lands here, re-read `en.json`. Heading string should be "Bible Languages". Tests that hardcode the old heading get updated in that sync PR or a follow-up, not by editing JSON in the feature PR.

## Todo

- [ ] No locale JSON diff in the UI PR
- [ ] `searchLanguages` used as search-view title
- [ ] `language` used as row label
- [ ] Existing search aria/placeholder keys reused
- [ ] `clearSearch` still unused
- [ ] Upstream value-edit PR open for `react.selectLanguageHeading`
- [ ] UI PR links the localization PR and states the string lag

## Success Criteria

- UI PR diff has zero files under `packages/ui/src/i18n/locales/`.
- Search view heading function is `t('searchLanguages')`.
- Versions row shows the `language` key, not a literal.
- Localization PR contains the single value change to "Bible Languages" plus generated output that repo expects.

## Risk

- Value-edit lands before the UI PR and changes the heading with no layout change. Harmless.
- Someone "fixes" the lag by editing `en.json` here. CI locale-ownership will fail. Revert that hunk.
- Reusing `selectLanguageHeading` for the search title becomes wrong the day the value-edit merges. Do not do it.

## Security

No secrets in strings. No locale files from untrusted paste. Follow the bot sync path in `docs/i18n-guidelines.md`.

## Next Steps

[phase-06-tests-stories-changeset.md](phase-06-tests-stories-changeset.md)
