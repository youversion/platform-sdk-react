# Verse of the Day

Two stacked `VerseOfTheDay` cards (sizes `default` and `lg`) for version `3034` and today’s passage.

## Sub-features

- Daily reference + verse body (no verse numbers)
- Share button (`aria-label` **Share**) on each card
- Loading status **Loading verse**
- Optional sun icon / Bible App attribution (SDK defaults; the demo does not pass those props)

## How to get to it (user POV)

1. Open the demo.
2. Click **Verse of the Day** in the header (or the hamburger menu).

## Driving it with Playwright

```bash
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs verse-of-the-day
```

1. Screenshot the reader (before).
2. Click **Verse of the Day**.
3. Wait for two `section[data-yv-sdk][data-size]` cards and a `[data-slot="yv-bible-renderer"]` inside.
4. Confirm a **Share** button is visible.
5. Screenshot (`02-votd.png`).

**End state that proves it:** two cards, each with scripture (or a distinct error `role="alert"` if the API refused the version — that is a product state, not a harness miss). Share is present. The page is no longer the full-height reader toolbar.

Do not click Share in unattended runs unless you intend to exercise `navigator.share` / clipboard; headed Chrome may show a native sheet.

## Gotchas

- Same app-key requirement as the reader.
- Passage id changes every calendar day — assert structure (cards, renderer, share), not a fixed USFM or English verse blob.
- `data-size` is `default` vs `lg` (larger type on the second card).
- Self-contained highlight paint needs a signed-in user with highlights permission; the demo does not pass a `highlights` prop.
