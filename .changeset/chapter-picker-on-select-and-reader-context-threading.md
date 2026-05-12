---
"@youversion/platform-react-ui": minor
---

Add `onSelect` callback to `BibleChapterPicker.Content` and `onChapterPickerPress` to `BibleReader.Root`

- `BibleChapterPickerSelectData` type exported for `onSelect` payload
- `onSelect` prop on `Content` fires after internal state updates, before `onRequestClose`
- `onChapterPickerPress` prop on `BibleReader.Root` threaded through context to `Toolbar`, suppressing default popover when provided
