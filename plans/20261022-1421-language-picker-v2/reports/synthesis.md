# Synthesis — Language Picker v2

## Intent

Bring the Bible version/language overlay in line with Figma node `4966:6915` (2026-10-22 changelog). Behavior of tabs, search matching, recent versions, and YPE-4657 usable-version filtering stays. Chrome and information architecture change.

## Match plan

| # | Change | Phase |
| --- | --- | --- |
| 1 | Languages header: Bible Languages, search icon, Back, no Close | 01, 05 |
| 2 | Dedicated Search Languages view; delete bottom language filter | 01 |
| 3 | High-contrast Suggested / All; count from `totalLanguages` | 03 |
| 4 | Taller rows, larger section heading, keep `bg-muted` selection | 03 |
| 5 | Native + English inline | 03 |
| 6 | Versions: top search, full-width language row, no pill, no bottom search, no invented subtitle | 02 |
| 7 | `max-sm` sheet, `sm+` card | 04 |

## Architecture

Replace `isLanguagesOpen: boolean` with internal `PickerView = 'versions' | 'languages' | 'languageSearch'`. Mount one view. Do not keep the two-layer blur crossfade (it cannot represent three views and duplicates focus targets).

```
versions
  header: Bible Versions + Close (card only)
  body: version search, language row, recent, all
languages
  header: Back + Bible Languages + search icon
  body: Suggested | All pills, lists
languageSearch
  header: Back + Search languages
  body: autofocus field, Regional until query, then results
```

Standalone `BibleLanguagePickerContent` has no popover header. Context flag `headerOwnsChrome` (true only in the SDK popover branch) tells the language module to skip its own search button. Standalone draws that button itself so search still exists. No new public prop.

File split in phase 01, before feature edits stack into the 1103-line file:

```
packages/ui/src/components/bible-version-picker/
  index.tsx            # Root, Trigger, context, compound export
  version-list.tsx     # versions body
  language-panel.tsx   # languages + search views
  language-row.tsx
```

Delete flat `bible-version-picker.tsx` so the specifier `./bible-version-picker` resolves to the folder. Keep tests and stories where they are.

Item 7 decision: add optional `sizeVariant: 'card' | 'sheet'` and `showClose?: boolean` on `PopoverContent`, both defaulting to current behavior (`card`, close shown). Sheet classes apply under `max-sm` only. If a spike shows Floating UI inline style beating `fixed inset-0`, or overlay-tap cannot exist without a dialog, stop and add internal `ui/sheet.tsx` on `@radix-ui/react-dialog`. Do not change `dialog.tsx`. Do not export Sheet.

## PR split

- **PR1 (minor, `@youversion/platform-react-ui`):** phases 01–03 + unit tests updated for the new flow + stories that still fit the card. One changeset. Public props unchanged.
- **PR2 (patch):** phase 04 + a mobile story. Fold into PR1 only after the folder split, and only if the diff stays reviewable.
- **Localization PR (platform-localization):** value-edit `react.selectLanguageHeading` to "Bible Languages". No new keys required for the locked copy. Do not touch `packages/ui/src/i18n/locales/**` here (locale-ownership CI).

Until that sync merges, `t('selectLanguageHeading')` still renders "Select a Language". That is expected. Do not assert "Bible Languages" in this repo first.

## YAGNI

- Do not wire `clearSearch`. No clear button in the changelog.
- Do not change `getLanguageDisplayName` sort order.
- Do not unique-ify the version count.
- Do not add a subtitle key.
- Do not restyle `ui/tabs.tsx` (only consumer today, but keep the primitive generic). Override classes at the call site.
- Do not preserve the crossfade to satisfy the 2-panel test. Update the test.

## Unresolved questions

- [ ] Versions header subtitle — Figma may show a total. No key exists. **Assumption: omit.** Add one only if design supplies copy via platform-localization.
- [ ] Badge sum double-counts a version that is both recent and in `filteredVersions`. **Assumption: keep the sum.** Do not change it in this work.
- [ ] Back from Search Languages clears the query and returns to the language list, preserving the Selected/All tab. **Assumption: yes.** Empty query while still on the search view shows Regional, not the tabs. This replaces the old "clear input restores tabs" behavior.
- [ ] Search Languages header has no Close, same as Languages. **Assumption: yes** (Q2). Versions card keeps Close.
- [ ] `sizeVariant` vs internal Sheet is an engineering exit, not a product question. Record the path that shipped in the PR2 description.
- [ ] Sheet/card wrapper stays off the host `open` / `onRequestClose` body. **Assumption: yes.**
- [ ] High-contrast pill colors are semantic tokens on `data-yv-theme`. If dark contrast fails, adjust tokens only. No new palette and no dark artboard (Q4).
- [ ] `BibleVersionPickerLanguageTrigger` stays exported for hosts and direct tests. The SDK header stops rendering it once the row exists. Confirm no in-repo reader header depends on the hidden-pill layout (reader passes the compound picker; the pill is inside `Content`).
