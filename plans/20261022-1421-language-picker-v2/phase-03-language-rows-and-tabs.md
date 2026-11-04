# Phase 03 — Language rows and tabs

## Context Links

- [plan.md](plan.md)
- [research/researcher-01-figma-changelog.md](research/researcher-01-figma-changelog.md) items 3–5
- [research/researcher-02-matchability-and-defaults.md](research/researcher-02-matchability-and-defaults.md)
- [scout/scout-01-picker-codebase.md](scout/scout-01-picker-codebase.md)

## Overview

Restyle language rows and the Suggested/All pills. Selection behavior, tab values, and the All count stay. Labels become native + English inline.

## Key Insights

- `LanguageRow` (today ~906–943) sets `aria-label` to `display_names.en` and lays out English at the start, native at the end, `justify-between`. Visible text and the accessible name both need to change. Drop the English-only `aria-label` so the name is the visible text. Tests use `/spanish/i`, `/korean/i`, `/english/i`, which still match.
- `getLanguageDisplayName` sorts by interface language. Leave it. Row text is a different rule.
- `ui/tabs.tsx` is only imported by this picker. Still override classes at the call site. Do not edit the primitive.
- `allLanguagesTab` already interpolates `totalLanguages`. Do not pass a literal 72.
- Q1: selected row keeps `yv:bg-muted`.
- Q3: high-contrast pills. Q4: semantic tokens so `data-yv-theme` dark still works.

## Requirements

- Primary: `display_names[language.id] || display_names.en || language.id`.
- Secondary: `display_names.en` only when it differs from primary. Omit when equal (English).
- Both inline, start-aligned, gap between them. Not `justify-between`. Not pinned to the far end.
- Each name in `<bdi dir="auto">`.
- Row taller than `Item` `size="sm"`. Prefer `size="default"` plus vertical padding on this row only. Do not change `ui/item.tsx` defaults.
- Section headings (`regionalHeading`, `allLanguagesHeading`, and the search-view Regional heading) step up from `text-lg` to `text-xl` `font-bold`. One size for all three.
- Tabs: Suggested and All. Same values `suggested` | `all`. All label still `t('allLanguagesTab', { count: totalLanguages })`.
- Active pill: high contrast against the list (`bg-foreground text-background` or the closest existing token pair). Inactive: muted. Full-width list stays. Bold active state can stay.
- Selected language row: `yv:bg-muted` plus hover. Unselected: hover only.
- Search results use the same `LanguageRow`.

## Architecture

Helper next to the row, not the sort helper:

```
function languageRowNames(language): { primary: string; secondary?: string }
```

Use it in `language-row.tsx` only. The versions entry row (phase 02) may call it for the selected language so the name matches. Do not use it to sort `uniqueLanguages`.

Pill classes: `className` on `TabsList` / `TabsTrigger` inside `language-panel.tsx`.

## Related Code Files

- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/language-row.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/language-panel.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/tabs.tsx` (read only)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/item.tsx` (read only)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker.test.tsx`

## Implementation Steps

1. Add `languageRowNames`. Primary native, secondary English when different.
2. Rebuild `LanguageRow` content: one start-aligned row, primary then secondary. Remove `justify-between` and the English `aria-label`.
3. Increase row height via item size/padding on this component only.
4. Bump the three section headings to `text-xl`.
5. Override tab classes for the high-contrast active pill. Check light and dark (`data-yv-theme`) in stories.
6. Leave tab state, `onValueChange`, and count argument alone.

## Todo

- [ ] Native primary, English secondary, inline
- [ ] English-only rows have no duplicate secondary
- [ ] Selected row still `bg-muted`
- [ ] Taller rows, larger headings
- [ ] High-contrast pills, same tab behavior
- [ ] All count still `totalLanguages`
- [ ] `ui/tabs.tsx` and `ui/item.tsx` untouched

## Success Criteria

- Spanish row reads like `Español Spanish` on one side, not English at the start and Spanish at the far end.
- English row reads `English` once.
- Korean search result uses the same layout.
- Suggested / All still switch lists. All shows the live count from fixtures (3 languages in the unit fixture, not 72).
- Active pill is visibly stronger than today's `bg-background` on `bg-muted`, in light and dark.
- Clicking the selected language still fires `onLanguageChange` and closes.

## Risk

- RTL: inline order must follow `dir`, not hardcoded `margin-left`. Use `gap` and logical direction. Names stay `dir=auto` inside `bdi`.
- High-contrast `bg-foreground` on dark theme can invert too hard. Use semantic tokens only. If contrast fails, tweak the class, do not add a hex.
- Removing `aria-label` changes the accessible name from English-only to both strings. Regex tests should still pass. A test that expects the name to be exactly "Spanish" will fail. Update it to the visible string.

## Security

Names are API strings rendered as text. No `dangerouslySetInnerHTML`. No extra locale files.

## Next Steps

[phase-04-responsive-shell.md](phase-04-responsive-shell.md) (PR2). PR1 can merge after phase 06 without this phase.
