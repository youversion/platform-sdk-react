---
'@youversion/platform-react-ui': patch
---

BibleReader now keeps the previous chapter's text on screen while the next chapter loads, dimming it and floating a spinner over it (after a short delay) instead of pulsing stale text or flashing a blank spinner. Fast/cached chapter switches stay instant, the scroll position resets to the top on chapter change, and the `useDelayedLoading` helper is shared with BibleCard. No changes to BibleTextView.
