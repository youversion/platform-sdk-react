---
'@youversion/platform-react-ui': minor
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
---

Refactor verse HTML transformation to support verse-level highlighting. Extract HTML processing logic to `verse-html-utils.ts` with new `wrapVerseContent()` function that wraps verse content in CSS-targetable `<span class="yv-v">` elements. Simplify footnote extraction using wrapped verse structure. Remove CSS rule preventing text wrapping. Add comprehensive test coverage for verse wrapping behavior.
