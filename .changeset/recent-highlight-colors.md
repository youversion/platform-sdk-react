---
'@youversion/platform-react-ui': patch
---

BibleReader's verse action popover now shows the user's recent highlight colors and marks active swatches with a checkmark (YPE-1034 PR3, still behind the internal `HIGHLIGHTS_LIVE` flag).

- **Recent colors**: when highlights are live (flag on + auth provider + signed in), the color row renders the server's recent-colors list (recently used first, then defaults) via `useBibleReaderHighlights` → `useHighlights.getRecentColors`. The list is deduped first-occurrence-wins, normalized (lowercase, leading `#` stripped, non-`/^[0-9a-f]{6}$/` entries dropped), never reordered (server order is the truth), and the row scrolls horizontally if it overflows. It falls back to the hardcoded `HIGHLIGHT_COLORS` palette whenever recents are unavailable — flag off, no auth provider, signed out, fetch pending, or fetch failed. The fetch runs once per live edge (not per tap or per navigation).
- **Checkmark swap**: active/remove swatches now render a 24px checkmark (`icons/check`) instead of the X, matching iOS (platform-sdk-swift #179). Same theme-invariant `#121212` fill and identical behavior — tapping still removes the highlight.
- **Type**: `HighlightColor` (exported from `verse-action-popover`) is widened from the five-literal palette union to `string`, since recents can be any hex. This is a loosening (every prior value still assignable), so it is non-breaking for consumers. `HIGHLIGHT_COLORS` remains exported as the default palette.
