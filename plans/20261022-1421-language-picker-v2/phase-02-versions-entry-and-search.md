# Phase 02 — Versions entry and search

## Context Links

- [plan.md](plan.md)
- [research/researcher-01-figma-changelog.md](research/researcher-01-figma-changelog.md) item 6
- [research/researcher-02-matchability-and-defaults.md](research/researcher-02-matchability-and-defaults.md)
- [scout/scout-01-picker-codebase.md](scout/scout-01-picker-codebase.md)

## Overview

Versions gets a top search field and a full-width Language row under it. Header pill goes away. Bottom version search goes away. No subtitle unless a real string already exists (it does not).

## Key Insights

- Pill component `BibleVersionPickerLanguageTrigger` is public. Tests and hosts render it directly. Stop using it in the SDK header. Do not delete the export.
- Badge count is `filteredVersions.length + filteredRecentVersions.length`, with a spinner while `versionsLoading`. Reuse that. Do not unique the set.
- Accessible name of the pill is `selectLanguageAriaLabel` ("Select a Language"). The row's visible text becomes `t('language')` plus the language name. Tests that click `/select a language/i` inside the header must target the row (phase 06).
- `getVersionSearchInput` finds `versionSearchAriaLabel`. Moving the field is safe if the name stays.
- Subtitle: omit. `allVersionsHeading` is not a count line.

## Requirements

- Order inside Versions, top to bottom: header (title + Close), version search, language row, scroller (recent, then all).
- Search field: full width, same `versionSearchAriaLabel`, `searchPlaceholder`, same `searchQuery` behavior (filters recent and all).
- Language row, full width, one button: `GlobeIcon`, label `t('language')`, selected language name, count (or loader), `ChevronForwardIcon`.
- Click runs the same action as the pill: `set` view to `languages`, unless `onClick` calls `preventDefault` (keep that contract on the public trigger; the row is the in-picker control and always opens).
- Name text: native primary (`display_names[id] || display_names.en || id`) so it matches the list. Wrap in `<bdi dir="auto">`.
- Header `headerChild` is null whenever the row is shown (SDK popover and the versions body).
- No bottom version-search section.
- No invented "N versions" subtitle.
- Standalone `Content` (host body) gets the same top search + row. It has no popover header, so there is no pill to hide there today. Row still opens languages only if the host mounted the language view. If this body cannot switch views by itself, the row calls the same context setter the pill uses so a host that renders both pieces still works. Do not require `onVersionPickerPress` hosts to implement a new callback.

## Architecture

Put the row in `version-list.tsx` (or `language-entry.tsx` if the list file gets crowded). It reads context: `selectedLanguageId`, `useLanguage`, `filteredVersions`, `filteredRecentVersions`, `versionsLoading`, view setter.

Do not render `BibleVersionPickerLanguageTrigger` inside `PopoverContent` `headerChild`.

Chevron: `ChevronForwardIcon` from `icons/chevron-forward.tsx`. Do not use physical left/right icons. `dir` on the row follows interface direction.

## Related Code Files

- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/version-list.tsx` (after phase 01)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/index.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.tsx` (only if phase 01 has not landed)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/icons/globe.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/icons/chevron-forward.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/popover.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/i18n/locales/en.json` (read `language`; do not edit)

## Implementation Steps

1. Move the version `<section>` search from the bottom of the body to the top. Keep the input props.
2. Render the language row directly under that field, outside the scroll region so it stays put (match the header density; if the mock scrolls it away, scroll it with the list — default: sticky under the search, not inside the results).
3. Remove `BibleVersionPickerLanguageTrigger` from `headerChild`.
4. Delete the bottom search section.
5. Do not add subtitle markup.
6. Confirm `open=false` still clears `searchQuery` (existing effect on `Content`).

## Todo

- [ ] Top version search, bottom one gone
- [ ] Full-width language row with globe, `language` label, name, count, chevron
- [ ] Count uses the existing sum; loader while versions load
- [ ] Header pill not rendered
- [ ] `BibleVersionPickerLanguageTrigger` still exported
- [ ] No subtitle string added

## Success Criteria

- Open picker: search field is the first body control. Language row is under it. No pill in the header. No second search at the bottom.
- Typing still filters recent and all versions. Selecting a version still closes and clears search.
- Row click opens Languages.
- Count matches the old badge for the same data, including the double-count. Do not "fix" it.
- Header has no extra total line.

## Risk

- Sticky row plus `66svh` can clip the list. If the first recent row is hidden, drop sticky and let the row scroll. Do not add a new scroll container.
- Removing the pill changes the only in-picker control named "Select a Language". Update tests in phase 06 in the same PR so CI is not red.
- Public trigger still shows English (`display_names.en`). The new row uses native primary. That split is intentional: the row matches item 5; do not restyle the public pill in this phase.

## Security

No new storage. Recent versions stay in the existing key. Count is a length, not user HTML. Language name is text inside `bdi`, same as today.

## Next Steps

[phase-03-language-rows-and-tabs.md](phase-03-language-rows-and-tabs.md)
