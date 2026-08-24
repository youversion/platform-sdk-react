---
'@youversion/platform-react-ui': minor
---

`BibleCard` now caps its painted shell at 700px by default, or at a pixel `maxWidth`. Scripture fills that shell. Pass `maxWidth="100%"` for a full-bleed shell; that path keeps the 600px inner column, and scripture fills the column. Full-bleed hosts must pass `"100%"`. `VerseOfTheDay` and `BibleReader` are unchanged.
