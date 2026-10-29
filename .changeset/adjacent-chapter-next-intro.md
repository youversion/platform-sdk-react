---
'@youversion/platform-core': patch
---

`getAdjacentChapter` now goes from the last chapter of a book to the next book's intro when it has one, instead of skipping to chapter 1. Next and previous are now inverses, and `BibleReader`'s next-chapter button reaches book intros the way the Swift reader does.
