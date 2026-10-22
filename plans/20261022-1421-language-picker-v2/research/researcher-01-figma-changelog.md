# Researcher 01 — Figma changelog

## Source

- File: YVP — Reader SDK Design v2
- Node: `4966:6915` (Languages Overlay Current vs v2, new 2026-10-22)
- URL: https://www.figma.com/design/temXvWs3FR8DZdM8C17ajf/YVP---Reader-SDK-Design-v2?node-id=4966-6915
- This plan did not re-fetch pixels. Match list below is the locked brief for that node. Spot-check the node only when a spacing step is ambiguous.

Prior "fonts only" scope is void. The changelog is the spec.

## Match items

1. **Languages header.** Title "Bible Languages". Search icon. No Close on the Languages view. Back returns to Versions.
2. **Search Languages view.** Opened from that header icon. Field at the top. Regional list until the query is non-empty. Autofocus the field. Back returns to the language list. Remove the bottom language search filter.
3. **Suggested / All pills.** Restyle to high-contrast. Behavior unchanged. `All ({{count}})` stays API-driven.
4. **Rows.** Taller language rows. Larger section heading. Keep the selected-language highlight (Q1 = yes).
5. **Labels.** Data pattern stays native + English. Visual is inline, not far-end. See researcher 02. Current code is English-first `justify-between` and does not match the mocks.
6. **Versions.** Full-width Language row (globe / Language / name / count / chevron) under a top version search. Remove the bottom version search. Remove or hide the header language pill once the row exists. Subtitle totals only when a real string already exists. Do not invent one.
7. **Responsive.** `max-sm` ≈ mobile → full-viewport sheet. `sm+` keeps the popover card (~24rem / 66svh).

## Explicit non-matches

Do not build frames for download, audio, or edit-recent. Do not add region nickname glosses. Do not load Aktiv Grotesk. Do not hardcode mock counts 2308 or 72.

## Header matrix

| View | Title key | Leading | Trailing | Close |
| --- | --- | --- | --- | --- |
| Versions | `bibleVersionsHeading` | none | none (pill goes away in phase 02) | yes on card |
| Languages | `selectLanguageHeading` → "Bible Languages" after upstream edit | Back → versions | search icon | no |
| Search Languages | `searchLanguages` ("Search languages") | Back → language list | none | no |

Search view does not reuse `selectLanguageHeading` after the value-edit. That key becomes the list title. `searchLanguages` is the distinct unused key.
