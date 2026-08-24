---
'@youversion/platform-react-ui': minor
---

Add `maxWidth` to `BibleCard` so the painted shell defaults to 700px (or a pixel override). Full-bleed hosts must pass `maxWidth="100%"`; that path keeps the 600px inner column. The card lifts the Bible renderer `65ch` measure so scripture fills that column. VerseOfTheDay is unchanged.
