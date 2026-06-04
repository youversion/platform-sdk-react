---
'@youversion/platform-react-ui': patch
---

Improve the chapter-change loading experience in `BibleReader`/`BibleTextView`. Instead of pulsing the previous chapter's text while the next chapter loads, the outgoing text now fades to a low opacity in place (no layout shift) with a spinner overlaid and centered in the visible reading area. This avoids both the confusing stale-but-active text and the flash-of-empty-content a bare spinner would cause, and the opacity transition doubles as a smooth fade-in for the incoming chapter.
