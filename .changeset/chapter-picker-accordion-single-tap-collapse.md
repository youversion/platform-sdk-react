---
'@youversion/platform-react-ui': patch
---

Fix BibleChapterPicker requiring two taps to collapse an expanded book. The book
accordion now stays controlled for its whole lifetime instead of flipping to
uncontrolled when a book is collapsed.
