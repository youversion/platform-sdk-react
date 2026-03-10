---
'@youversion/platform-react-ui': patch
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
---

Remove shadow from VerseOfTheDay card, add loading spinner with animated height transition, and match width approach to BibleCard for consistency.

Replaced Verse.HTML in the VerseOfTheDay component with BibleTextView in favor of the baked-in error state when a Bible Verse cannot load for any reason.

BibleTextView now is now a forwardRef component, enabling users to pass in a React ref.
