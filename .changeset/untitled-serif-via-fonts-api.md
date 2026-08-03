---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Swap the SDK's serif face from Source Serif 4 to **Untitled Serif**, YouVersion's brand serif, delivered from the YouVersion Fonts API (YPE-1350, YPE-1910).

- The serif stack is now `'Untitled Serif', 'Source Serif 4', serif` in both token declarations (`--yv-font-serif` in core, `--font-serif` in the UI theme), so every serif surface follows: BibleReader body text, the Bible card, `BibleText`, the version-picker abbreviation tile, footnotes, chapter headings, and the `lg` Verse of the Day card. Untitled Serif is named first, so a host that loads its own copy takes priority regardless of who fetched it.
- `YouVersionProvider` now loads the font for you. It renders a hoisted `<link rel="stylesheet">` to `https://api.youversion.com/v1/fonts/1/stylesheet`, using the app key you already supply — **a new outbound request** to `api.youversion.com`, plus woff2 fetches from `cdn.youversion.com`. No new prop and no setup; there is no opt-out. No font file ships in any package.
- **Strict CSP consumers:** allowlist `https://api.youversion.com` in `style-src` and `https://cdn.youversion.com` in `font-src`. If they are blocked, serif text falls back to Source Serif 4 (still loaded from Google Fonts) with no layout break.
- **The BibleReader's default font changes** from Source Serif 4 to Untitled Serif, and the font picker button now reads "Untitled Serif" instead of "Source Serif". Readers whose saved preference is the old Source Serif stack are migrated on load, so the picker still shows serif as active. Any other `fontFamily` value you pass or persist is left untouched.
- The internal `SOURCE_SERIF_FONT` constant is deprecated (retained for that migration). The picker now reads a new `untitledSerifFontName` locale key; the old `sourceSerifFontName` key is retired in a follow-up sync. Neither is part of the public API; nothing is removed or retyped.

See `docs/adr/0004-adopt-untitled-serif-via-fonts-api.md` for the delivery rationale.
