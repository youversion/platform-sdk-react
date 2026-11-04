# Phase 01 — Panel state and search

## Context Links

- [plan.md](plan.md)
- [research/researcher-01-figma-changelog.md](research/researcher-01-figma-changelog.md) items 1–2
- [scout/scout-01-picker-codebase.md](scout/scout-01-picker-codebase.md)
- [reports/synthesis.md](reports/synthesis.md)

## Overview

Split the picker into a folder. Replace the languages boolean with three views. Add the Search Languages screen. Remove the bottom language field. Leave version search, row layout, and pills for later phases.

## Key Insights

- `Content` calls itself. Outer call is the popover shell. Inner call is the versions body. Split those on purpose.
- Two stacked crossfade layers cannot represent three views and stay in the a11y tree. Mount one view.
- `BibleLanguagePickerContent` is public and used without the popover header. Standalone still needs a way to open search.
- Test `bounds and animates…` expects 2 animated panels. That test changes in phase 06. Do not keep the crossfade for it.
- `closeLanguagePanel` already clears `languageSearchQuery`. Keep that when returning to versions.

## Requirements

- Views: `versions` | `languages` | `languageSearch`.
- Languages header: Back (existing `backToBibleVersionsAriaLabel`), title `t('selectLanguageHeading')`, search icon button (`languageSearchAriaLabel`). No Close on this view.
- Search view: title `t('searchLanguages')`. Back returns to `languages`, clears the query, keeps the Suggested/All tab. Field on top. Autofocus. `placeholder` = `searchPlaceholder`. `aria-label` = `languageSearchAriaLabel`.
- Empty search view shows Regional (`suggestedLanguages` + `regionalHeading`), not the tabs.
- Non-empty query shows `filteredLanguages` or `noLanguageSearchResults` or the loader. Same `filterLanguagesBySearch` rules. `data-testid="language-search-results"` stays.
- Selecting a language still sets id, clears search, calls `onRequestClose`.
- `open === false` still clears language search and leaves the next open on tabs (languages view, not search).
- Bottom language `<section>` is gone in both SDK and standalone.
- Version bottom search still works after this phase.
- `onVersionPickerPress` null render unchanged.
- `motion-reduce:transition-none` if any transition remains. Prefer no crossfade.

## Architecture

```
PickerView = 'versions' | 'languages' | 'languageSearch'
headerOwnsChrome: boolean  // true only for SDK popover shell
```

Popover shell reads the view and passes `heading`, `headerLeading`, `headerChild`, `showClose` (phase 01 adds `showClose` default `true` on `PopoverContent`).

| View | showClose | headerChild |
| --- | --- | --- |
| versions | true | unchanged pill (phase 02 removes it) |
| languages | false | icon button → `languageSearch` |
| languageSearch | false | none |

`BibleLanguagePickerContent`: if `!headerOwnsChrome` and view is `languages`, render the same search icon above the tabs. SDK shell sets the flag so the icon is not doubled.

Search field lives only in the `languageSearch` branch.

Inactive view unmounted. One heading in the dialog.

## Related Code Files

- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.tsx` (split, then delete)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/popover.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/index.ts`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/icons/search.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/icons/chevron-backward.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.test.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/AGENTS.md`

## Implementation Steps

1. Create `packages/ui/src/components/bible-version-picker/`.
2. Move `Root`, `Trigger`, context, recent-version helpers, and public exports into `index.tsx`. Re-export every symbol `components/index.ts` and the test already import (`RECENT_VERSIONS_KEY` included).
3. Move the versions body (today's second `Content` return) into `version-list.tsx` unchanged.
4. Move `LanguagePanel`, `LanguageRow`, `BibleLanguagePickerContent` into `language-panel.tsx` and `language-row.tsx`. Row markup stays until phase 03.
5. Delete `bible-version-picker.tsx`. Specifier `./bible-version-picker` must hit the folder.
6. Add `view` state. Keep a derived `isLanguagesOpen = view !== 'versions'` only if something still reads it. Prefer deleting the boolean once call sites use `view`.
7. Add `showClose?: boolean` to `PopoverContent` (default `true`). Reader settings must still show X. Pass `showClose={false}` for both language views.
8. Wire header search icon and search view. Autofocus with a ref + `useEffect` when `view` becomes `languageSearch`. On unmount of that view, move focus to Back or the search icon (whichever is visible).
9. Delete the bottom language search section.
10. Standalone: in-content search button when `headerOwnsChrome` is false.
11. Run the picker unit test. Failures tied to "input always mounted" or "2 panels" are expected; fix them in phase 06 before the PR merges. Do not revert the view model to green those tests.

## Todo

- [ ] Folder split, flat file removed, public exports unchanged
- [ ] Three views, one mounted at a time
- [ ] Languages header: Back, title, search icon, no Close
- [ ] Search view: top field, autofocus, Regional until query, Back to list
- [ ] Bottom language search removed
- [ ] Standalone language content can still open search
- [ ] `showClose` defaults true for other popovers
- [ ] Version search still at the bottom (phase 02 moves it)

## Success Criteria

- From the SDK picker: Versions → language control → Languages with no X and no bottom field → search icon → focused field and Regional → type a query → results → Back → tabs, query empty, previous tab still selected.
- Back from Languages returns to Versions and clears the query.
- Standalone `BibleLanguagePickerContent` can search without a popover header.
- `pnpm --filter @youversion/platform-react-ui exec vitest run --project unit src/components/bible-reader.tsx` not required; spot-check that reader settings popover still has Close (unit or story). No Sheet yet.

## Risk

- Folder + file name clash if both `bible-version-picker.tsx` and `bible-version-picker/index.tsx` exist. Delete the flat file in the same change.
- Hiding Close with a default-wrong prop removes X from reader settings. Default `true`.
- Hosts that automated the bottom language field will break. The replacement is the search view. Call that out in the PR.
- Focus can land on `body` after Back. Send it to the search icon or Back explicitly.

## Security

Search filters data already on the client. Do not log the query. Do not add a network call. Escape still closes the popover (Radix). Do not remove keyboard dismiss when hiding the X.

## Next Steps

[phase-02-versions-entry-and-search.md](phase-02-versions-entry-and-search.md)
