# Scout 01 — picker codebase

## Summary

One file, 1103 lines. Compound `Root` / `Trigger` / `Content`. `LanguagePanel` crossfades over versions. Both panels keep a bottom search. `LanguageRow` is English-first `justify-between`. Header hosts the language pill. No Sheet in the SDK. Keys `language`, `searchLanguages`, `clearSearch` are unused. Tests ~719 lines. Stories ~581 lines. Usable versions follow YPE-4657. i18n is platform-localization, not hand-edited JSON.

## File

`/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.tsx`

Public barrel: `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/index.ts` re-exports `BibleVersionPicker`, `BibleLanguagePickerContent`, `BibleVersionPickerLanguageTrigger`, and the public prop types.

## Map

| Symbol | Lines (approx) | Role |
| --- | --- | --- |
| `RECENT_VERSIONS_KEY`, recent storage | 49–106 | local recent list, max 3 |
| `filterLanguagesBySearch` | 112–124 | id, `language`, any `display_names` value |
| `Root` | 294–518 | context, data hooks, popover owner |
| `Trigger` | 534–593 | version button or `onVersionPickerPress` |
| `BibleVersionPickerLanguageTrigger` | 603–659 | pill: globe, English name, badge |
| `Content` | 661–894 | two modes, see below |
| `LanguagePanel` | 896–904 | shell around language content |
| `LanguageRow` | 906–943 | English start, native end |
| `BibleLanguagePickerContent` | 951–1100 | tabs or in-place search, bottom field |

## Content is two modes in one function

- No `open` and no `onRequestClose`: render `PopoverContent` and **call `Content` again** with `onRequestClose`. Inner call takes the body branch. Not infinite.
- Otherwise: versions list + bottom search. This is the host/standalone body.
- `onVersionPickerPress` without `open` / `onRequestClose`: return null. Host draws its own UI.

Popover branch crossfades two absolute layers (`isLanguagesOpen`). Test `bounds and animates the default language view` expects **2** nodes with `transition-all duration-300`.

## State already in context

`isLanguagesOpen`, `languageSearchQuery`, `searchQuery`, `filteredLanguages`, `suggestedLanguages`, `uniqueLanguages` as `languages`, `totalLanguages`, `filteredVersions`, `filteredRecentVersions`, `closeLanguagePanel` (clears language query and closes), `resetLanguageSearch`.

Data: `useLanguages` (all + `country: 'zz'`), `useVersions(selectedLanguageId)`, `useVersions('*')` for language tags, `useFilteredVersions`, `isUsableBibleVersion` on recents (YPE-4657). UI must not call core clients. Hooks only.

## Header today

`PopoverContent` heading swaps `selectLanguageHeading` / `bibleVersionsHeading`. Back chevron only when languages are open (`backToBibleVersionsAriaLabel`). `headerChild` is `BibleVersionPickerLanguageTrigger`, visibility hidden while languages are open. Close always comes from popover, not this file.

## i18n keys this file actually calls

`selectLanguageHeading`, `bibleVersionsHeading`, `backToBibleVersionsAriaLabel`, `recentlyUsedVersionsHeading`, `allVersionsHeading`, `noVersionsFound`, `versionSearchAriaLabel`, `searchPlaceholder`, `suggestedTab`, `allLanguagesTab`, `regionalHeading`, `allLanguagesHeading`, `noLanguageSearchResults`, `noRegionalLanguagesAvailable`, `languageSearchAriaLabel`, `selectLanguageAriaLabel`, `select`.

Unused in TS/TSX, present in `en.json`: `language` ("Language"), `searchLanguages` ("Search languages"), `clearSearch` ("Clear search").

## Tests that encode today's chrome

`/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.test.tsx`

- `openLanguagePanel` clicks `/select a language/i` (the pill).
- `getLanguageSearchInput` / `getVersionSearchInput` use accessible names, so a moved field still matches if the aria-label stays.
- Standalone language content asserts the heading **Select a Language** is absent (heading is popover-only).
- `open=false` clears either search on pre-warmed standalone content.
- Language search expects: typing hides tabs, clear restores the selected tab, back to versions clears the query.
- RTL test expects `dir=rtl` on dialog and tablist parent, `dir=auto` on the language field and name `bdi`.

Stories: `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.stories.tsx` (`LanguageSearch`, `SuggestedLanguagesTabs`, `InteractiveVersionSearch`, light/dark).
