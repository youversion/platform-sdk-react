---
"@youversion/platform-react-ui": minor
---

Add a verse action popover to `BibleReader`. Tapping verses selects them (shown with an underline) and opens a popover anchored to the last-selected verse with five highlight colors, Copy, and Share. Highlights apply a translucent fill, persist to `localStorage` per Bible version (shaped like the future highlight API), and can be removed individually. Copy/Share output mirrors bible.com formatting: the verse text in curly quotes, gaps in a non-contiguous selection joined with `...`, followed by the `Book Chapter:verses VERSION` reference. Share uses the Web Share API and falls back to copying where it isn't available.
