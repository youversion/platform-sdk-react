---
'@youversion/platform-core': patch
---

Align Bible reader typography with Swift phase-1 tag rules.

Rewritten USFM tag styles match Swift's adjusted size, weight, indent, alignment, and block spacing (logical properties). Unadjusted tags and reader chrome stay as they are. Verse labels raise 0.2em. Adjacent-sibling combinators that overrode phase-1 margins are removed.
