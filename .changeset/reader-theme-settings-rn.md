---
'@youversion/platform-react-ui': minor
---

Expose `BibleThemeSettingsContent` and add optional `onOpenBibleThemeSettings` on `BibleReader.Toolbar` with a **serializable** `BibleThemeSettingsSnapshot` payload for Expo DOM hosts. Export `BIBLE_READER_FONT`, `clampBibleReaderFontSize`, `nextBibleReaderFontSizeUp`, and `nextBibleReaderFontSizeDown` so native can apply edits without closure payloads. Add optional controlled typography on `BibleReader.Root` via `fontSize`/`fontFamily` with `onFontSizeChange`/`onFontFamilyChange` (and `defaultFontSize` / `defaultFontFamily` for defaults).
