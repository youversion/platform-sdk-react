---
"@youversion/platform-react-ui": minor
---

Add a verse action popover to `BibleReader`. Tapping verses selects them (shown with an underline) and opens a popover anchored to the last-selected verse with five highlight colors, Copy, and Share. Highlights apply a translucent fill, persist to `localStorage` per Bible version (shaped like the future highlight API), and can be removed individually. Copy/Share output mirrors bible.com formatting: the verse text in curly quotes, gaps in a non-contiguous selection joined with `...`, followed by the `Book Chapter:verses VERSION` reference. Share uses the Web Share API and falls back to copying where it isn't available.

`BibleReader` also accepts optional `onCopy` / `onShare` props. When provided, they receive the structured selection payload and suppress the default Web Share / clipboard flow, so React Native / Expo hosts can forward it across the native bridge (mirrors `VerseOfTheDay`'s `onShare`).

Note: `BibleTextViewProps.highlightedVerses` changed from `Record<number, boolean>` to `Record<number, string>` (verse number → highlight hex). This prop was never wired into shipped usage, so no released consumer is affected; the bump stays `minor`.
