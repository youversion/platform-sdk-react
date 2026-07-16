---
'@youversion/platform-react-ui': patch
---

BibleReader's verse action popover now marks active swatches with a checkmark (YPE-1034 PR3, still behind the internal `HIGHLIGHTS_LIVE` flag).

- **Checkmark swap**: active/remove swatches now render a 24px checkmark (`icons/check`) instead of the X, matching iOS (platform-sdk-swift #179). Same theme-invariant `#121212` fill and identical behavior — tapping still removes the highlight.
