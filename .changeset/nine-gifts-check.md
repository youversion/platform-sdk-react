---
'@youversion/platform-react-ui': minor
---

Add a cycling line spacing setting to BibleReader

The Bible theme settings panel now includes a line spacing control that cycles
through three presets (small `1.45`, default `1.7`, large `2.0`) on each press.
The selection persists to `localStorage` when uncontrolled.

`BibleReader.Root` gains `lineSpacing`, `defaultLineSpacing`, and
`onChangeLineSpacing` props for controlled/uncontrolled usage. The existing
`lineHeight` prop is deprecated but still honored as the initial line spacing,
so this change is backward compatible; it will be removed in the next major.
