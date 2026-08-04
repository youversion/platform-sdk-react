---
'@youversion/platform-react-ui': patch
---

Fix secondary buttons rendering their label in the muted text color, which made active controls read as disabled. The `secondary` variant now pairs `bg-muted` with the normal foreground color in both light and dark themes. This is most visible on the BibleCard version picker button, and also affects the secondary buttons in BibleReader, BibleChapterPicker, BibleVersionPicker, and the highlight permission dialog.
