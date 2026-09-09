# Bible Card

Single embeddable card for **John 3:16** (`JHN.3.16`) in version `3034`, with the version picker enabled.

## Sub-features

- Passage reference heading (`h2`, uppercase tracking)
- Version picker trigger (**Change Bible version**)
- Scripture body in `[data-slot="yv-bible-renderer"]`
- Footer copyright + Bible App lockup
- Footnotes when the passage has them (`[data-verse-footnote] button`)

## How to get to it (user POV)

1. Open the demo.
2. Click **Bible Card** in the header (or the hamburger menu).

## Driving it with Playwright

```bash
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs bible-card
```

1. Screenshot the current page (before).
2. Click **Bible Card**.
3. Wait for `section[data-yv-sdk]` with an `h2`, the version trigger, and the renderer.
4. Screenshot (`02-bible-card.png`).

To prove the picker (not in the helper): click **Change Bible version**, choose another abbreviation, wait for the `h2` to include the new abbreviation and the body to refresh (loading spinner on the header during refetch).

**End state that proves it:** heading is a passage reference (John 3:16 / localized equivalent plus abbreviation), renderer has verse text, version button is enabled.

## Gotchas

- The demo hard-codes `reference="JHN.3.16"` and `showVersionPicker`. A 404/unavailable passage in the selected version keeps the picker so the user can switch — that error heading is `Error` in the `h2` slot, not a crash.
- Card verses do not use the reader toolbar. Do not look for next/previous chapter here.
- Max width is the SDK default (700px), centered in the demo page padding.
