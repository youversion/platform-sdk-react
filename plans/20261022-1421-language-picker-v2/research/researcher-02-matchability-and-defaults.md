# Researcher 02 — matchability and defaults

## What already matches

- Suggested / All tabs exist. `allLanguagesTab` is `All ({{count}})`. `totalLanguages` is `uniqueLanguages.length`.
- Regional block is `suggestedLanguages` (browser languages, then `useLanguages({ country: 'zz' })`), not a hand-written region list.
- Selected row already uses `yv:bg-muted` when `language.id === selectedLanguageId`.
- Light/dark is `data-yv-theme` on popover and language content. No second palette.
- Version and language search already filter client-side. Queries are not a new API.
- Card metrics already match item 7 at `sm+`: `PopoverContent` is `w-sm` (24rem) and `max-h-[66svh]`. Picker also sets `h-[66svh]`.
- `GlobeIcon`, `SearchIcon`, `ChevronForwardIcon`, `ChevronBackwardIcon` exist.
- Hosts can skip the popover via `onVersionPickerPress` and render `Content` / `BibleLanguagePickerContent` with `open` + `onRequestClose`.

## What does not match

- One boolean `isLanguagesOpen`. No third view.
- Bottom search on both panels. Languages filter in place and hides tabs while `languageSearchQuery` is non-empty.
- Header language control is `BibleVersionPickerLanguageTrigger` (pill + badge), not a full-width row.
- `LanguageRow` puts `display_names.en` on the start and `display_names[id]` on the end with `justify-between`.
- `LanguageRow` `aria-label` is English only.
- Popover header always renders `PopoverClose`. No `showClose` prop.
- `max-sm` only narrows the card (`max-w-[calc(100vw-2rem)]`). No sheet, no overlay.
- `language` and `searchLanguages` are in `en.json` and unused by TS/TSX.
- Sort helper `getLanguageDisplayName` uses `display_names[selectedLanguageId]`, then `en`, then `id`. That is interface-language sort, not the row's native label. Do not reuse it for row text.

## Label rule (item 5)

```
primary   = display_names[id] || display_names.en || id
secondary = display_names.en when it differs from primary
layout    = both inline, start-aligned, small gap
```

English-only languages omit the secondary. Keep `<bdi dir="auto">` on each name.

## Locked assumptions

| ID | Assumption |
| --- | --- |
| Q1 | Keep active-language highlight (`yv:bg-muted`). |
| Q2 | Back is the language-view exit. Keep `PopoverClose` on the Versions card (`sm+`). Mobile sheet dismisses on overlay tap. No Close on Languages or Search Languages. |
| Q3 | High-contrast pills from the v2 hybrid frames. Override classes on this picker only. |
| Q4 | Ship light and dark through `data-yv-theme`. No Figma dark artboard required. |
| Q5 | Counts from data: `totalLanguages`, `filteredVersions.length`, existing badge sum. Never hardcode 2308/72. |

## Count caveat

Header badge today is `filteredVersions.length + filteredRecentVersions.length`. A recent version can also sit in `filteredVersions`, so the sum can double-count. Move that same number onto the new row. Do not invent a unique-count fix here.

## Subtitle

No existing key is a versions total line. `allVersionsHeading` is the section title "All Versions". Omit the header subtitle. Do not add a key in this repo.
