---
'@youversion/platform-react-ui': minor
---

BibleReader gains a controlled highlights mode (YPE-3705) for hosts that own highlight data themselves (e.g. React Native / Expo DOM hosts keeping the user token out of the WebView).

- New `BibleReader.Root` props: `highlights?: Highlight[]` (core API shape; presence puts the highlight slice in controlled mode, latched at first mount), `onVerseSelect` (both modes, fires on every selection change — `verses: []` whenever a non-empty selection clears, including after highlight/copy/share actions, popover dismiss, and navigation), and `onHighlightApply` / `onHighlightRemove` (controlled mode only; ignored in self-contained mode). Payloads are serializable, bridge-safe objects (`BibleReaderVerseSelection`, `BibleReaderHighlightIntent`) with always-per-verse `passageIds`.
- In controlled mode the reader is a pure projection: highlights render solely from the prop (filtered by displayed version + chapter, range USFMs like `JHN.3.16-18` expanded per verse), color taps emit intents and paint nothing until the host round-trips an updated prop, and neither the highlights API nor any local store is touched. No auth surface can originate from the highlight path.
- Self-contained behavior (no `highlights` prop) uses the server-backed `useBibleReaderHighlights` path (YPE-1034), dark-launched behind `HIGHLIGHTS_LIVE`.
- `@youversion/platform-react-ui` now re-exports the `Highlight` type from `@youversion/platform-core`.
