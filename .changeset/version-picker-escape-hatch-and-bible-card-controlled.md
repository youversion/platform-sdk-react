---
"@youversion/platform-react-ui": minor
---

Add `onVersionPickerPress` escape-hatch prop to `BibleReader.Root` and `BibleCard`, and make `BibleCard.versionId` controllable.

- `BibleReader.Root` accepts `onVersionPickerPress?: (data: BibleVersionPickerPressData) => void`, threaded through context to Toolbar and then to the internal `BibleVersionPicker.Root` — suppresses the default popover when provided
- `BibleCard` accepts `onVersionPickerPress`, `defaultVersionId`, and `onVersionChange`; `versionId` is now optional and uses `useControllableState` for controlled/uncontrolled support
- `BibleVersionPicker.Root` guards `isPopoverOpen` state when escape hatch is active, moves `filteredRecentVersions` to context to eliminate duplication between `Content` and `BibleVersionPickerLanguageTrigger`
- `BibleChapterPicker.Root` guards `isPopoverOpen` state when `onChapterPickerPress` is active
- `BibleWidgetView` removed (zero consumers)
- `BibleVersionPickerPressData` type exported: `{ versionId: number; languageId: string }`
