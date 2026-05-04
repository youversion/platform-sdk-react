---
"@youversion/platform-react-ui": minor
---

Add `onFootnotePress` callback prop to `BibleTextView`, `Verse.Html`, and `BibleReader.Root`. When provided, suppresses the Radix popover and calls the callback with a serializable `FootnoteData` payload. Export `FootnoteContent` component for rendering footnote data standalone (e.g. inside an Expo DOM component). Exports new `FootnoteData` and `FootnoteContentProps` types.
