---
"@youversion/platform-react-ui": minor
---

Add `onFootnotePress` callback prop to `BibleTextView`, `Verse.Html`, and `BibleReader.Root`. When provided, suppresses the Radix popover and calls the callback with a serializable `FootnoteData` payload. Exports new `FootnoteData` type.
