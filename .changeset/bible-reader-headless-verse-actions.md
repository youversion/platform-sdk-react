---
'@youversion/platform-react-ui': minor
---

`BibleReader` can now hand verse actions to the host (YPE-2894). Three additive changes; **every default is unchanged**, so existing consumers see identical behavior.

- New `BibleReader.Root` prop `verseActions?: 'popover' | 'none'`. `'popover'` is the default and renders the built-in `VerseActionPopover` exactly as before. `'none'` renders no verse-action UI at all while keeping everything else intact — verses still select and paint, `onVerseSelect` still fires, highlight intents still reach `onHighlightApply` / `onHighlightRemove`, and the Copy / Share payload is still built. Use it when the host owns the action UI (a React Native host presenting a native bottom sheet, where a second in-WebView popover would stack on top of it).
- New `BibleReader.Root` prop `clearSelectionSignal?: number`. Any change to the value clears the current verse selection from outside the reader, emitting `onVerseSelect` with `verses: []`. The value at mount is the baseline, so mounting never clears. It is a counter rather than an imperative `ref` handle because Expo DOM components accept only serializable props. Needed with `verseActions="none"`, where nothing inside the reader clears the selection any more.
- `BibleReaderVerseSelection` (the `onVerseSelect` payload) gains two fields: `reference`, the localized display reference **without** the version abbreviation (`Hebrews 11:4`, falling back to the USFM book code until `useBooks` resolves, `''` on clear), and `shareData`, the same `BibleReaderShareData` the popover's Copy / Share buttons produce (`null` on clear). `reference` and `shareData.reference` deliberately differ — copied text keeps the version (`Hebrews 11:4 BSB`), a UI label does not.

`BibleReaderHighlightIntent` is unchanged: it no longer spreads the full selection type, so intents still carry identity and color only.
