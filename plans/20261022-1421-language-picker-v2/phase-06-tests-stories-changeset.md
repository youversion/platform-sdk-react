# Phase 06 — Tests, stories, changeset

## Context Links

- [plan.md](plan.md)
- [docs/testing.md](../../docs/testing.md)
- [docs/release-hardening-decisions.md](../../docs/release-hardening-decisions.md) Decision 4
- [AGENTS.md](../../AGENTS.md)
- [scout/scout-01-picker-codebase.md](scout/scout-01-picker-codebase.md)

## Overview

Update unit tests and stories to the new flow. Add a minor changeset on PR1 and a patch changeset on PR2. Do not assert the upstream "Bible Languages" string before sync.

## Key Insights

- Helpers in `bible-version-picker.test.tsx`: `openLanguagePanel` clicks `/select a language/i`. After phase 02 that control is the row (`language` + name), not the pill. Point the helper at the row.
- `getLanguageSearchInput` / `getVersionSearchInput` use accessible names. They survive moves. They fail if the language field is unmounted. Open the search view before querying it.
- These tests encode the old bottom filter and the crossfade. Update them. Do not restore old UI.
  - `bounds and animates the default language view` expects 2 animated panels and a `.yv:relative` viewport.
  - `open=false clears language search` types into the field immediately on standalone content.
  - `preserves the selected tab after clearing language search` expects clearing the input to restore tabs. New behavior: empty query on the search view shows Regional; Back restores tabs and the selected tab.
  - RTL test expects the language textbox on the languages view. Open search first. Still expect `dir=auto` on the field and `dir=rtl` on the dialog.
- Standalone language test expects heading "Select a Language" absent. Keep that. The heading is popover chrome.
- All-count assertions must use fixture length (`mockLanguages` that have versions), never 72 or 2308.
- Stories ~581 lines. `LanguageSearch` must follow header icon → field. Add a `max-sm` story only with phase 04.
- Changeset required. Empty changeset is wrong: this ships user-visible UI. Level: PR1 **minor**, PR2 **patch**. Package: `@youversion/platform-react-ui` only.
- `pnpm lint` is oxlint. Do not suppress anti-slop rules.

## Requirements

- Unit: `pnpm --filter @youversion/platform-react-ui exec vitest run --project unit src/components/bible-version-picker.test.tsx`
- Story play: `pnpm --filter @youversion/platform-react-ui exec vitest run --project storybook src/components/bible-version-picker.stories.tsx`
- Cover: three-view navigation, no bottom language field, top version search, no header pill, native+English row, selected `bg-muted`, All count from data, search empty state, `open=false` reset, `onVersionPickerPress` still skips the shell, RTL `dir`.
- PR2 adds a story that sets a narrow viewport and expects a full-bleed shell. Skip that story on PR1.
- Changeset files under `.changeset/`. No hand-written changelog.
- Do not edit locale JSON to make a heading assertion pass.

## Architecture

Keep tests next to the old path:

- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.test.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.stories.tsx`

Imports stay `./bible-version-picker` after the folder move.

Assert roles and names, not crossfade class strings. Replace the 2-panel query with: languages heading present, version list absent (or `hidden` not in tree), and the reverse after Back.

## Related Code Files

- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.test.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.stories.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/docs/testing.md`
- `/Users/cameron/Code/localization/platform-sdk-react/docs/release-hardening-decisions.md`
- `/Users/cameron/Code/localization/platform-sdk-react/.changeset/README.md`
- `/Users/cameron/Code/localization/platform-sdk-react/examples/vite-react` (manual card check; env from repo root)

## Implementation Steps

1. Update helpers: open languages via the row; open search via the icon; then use the existing textbox getters.
2. Rewrite the tests listed in Key Insights. Keep behavior tests that should not change (recent cap, usable versions, version select calls `onRequestClose`, trigger `preventDefault`).
3. Add one test that Spanish/Korean row text is native then English inline (fixture `display_names` already has `es` / `ko`).
4. Add one test that All tab text includes `String(total)` from the rendered fixture, not a hardcoded design count.
5. Update `LanguageSearch` and `InteractiveVersionSearch` stories so `play` uses the new entry points.
6. PR2 only: story with mobile viewport, full-bleed shell, overlay present.
7. `pnpm changeset` — minor on PR1, patch on PR2. Summary says why (overlay matches the v2 language changelog; mobile shell).
8. `pnpm lint` on the touched package. Fix by editing code, not by disabling rules.
9. Browser: `examples/vite-react` picker. Walk Versions → Languages → Search → Back → Back. Then a narrow window when PR2 exists. Desktop and a sub-640 width. This is required for UI work; a story screenshot is not enough.

## Todo

- [ ] Unit file green, including updated search and animation tests
- [ ] Row label test (native + English)
- [ ] All count from fixture data
- [ ] Storybook play green
- [ ] PR2 mobile story, if that PR exists
- [ ] Minor changeset (PR1) and patch changeset (PR2)
- [ ] Lint clean
- [ ] Vite demo walked on desktop; mobile walked if phase 04 is in the branch

## Success Criteria

- Both vitest commands above pass.
- Diff does not include `packages/ui/src/i18n/locales/**`.
- Changeset status is not empty.
- Demo: no bottom search, language row opens Languages, search icon opens a focused field, Back stack is search → languages → versions, selected language stays highlighted.
- PR2 demo: narrow viewport is full screen; wide viewport is the card.

## Risk

- Asserting "Bible Languages" fails until sync. Assert the heading role via the current `en.json` string or via the key's rendered output without hardcoding the future value.
- Story `play` that still types into a bottom field will time out. Update stories in the same PR as the UI.
- Folder move can leave the story or test importing a deleted path. Both should use `./bible-version-picker`.

## Security

Tests use fixtures. Do not point the demo at a new auth scope. Navbar sign-in stays profile and email. No highlight grant changes in this work.

## Next Steps

PR1: phases 01–03 + this phase, minus the mobile story. PR2: phase 04 + mobile story. Localization PR from phase 05 in parallel. Stop. Do not start download/audio frames.
