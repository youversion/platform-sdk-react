# YouVersion SDK Demo

A demo app showcasing `@youversion/platform-react-ui` components.

**Hosted demo:** https://youversion.github.io/platform-sdk-react/

## Setup

Run these commands from the repository root:

```bash
cp .env.example .env
# Add your YouVersion App Key to .env
# Optional: VITE_YVP_LOCALE and VITE_YVP_DEFAULT_LANGUAGE_ID (e.g. es)
pnpm install
pnpm dev:web
```

## React SDK Components Used

- **Bible Reader** — Full interactive Bible reader with chapter/version navigation
- **Verse of the Day** — Daily verse card
- **Bible Card** — Embeddable Bible passage card
- **Images** — Smoke page for `ImagesClient` list and detail (metadata only)
- **Sign in with YouVersion Button** - Authentication with YouVersion

## Verse marker smoke test

1. Open **Bible Reader** at John 1. Click the purple marker beside verse 3 and
   check that the status reads “Opened marker for JHN.1.3.”
2. Tap the text of verses 1 and 4, then choose **Mark verses** in the verse
   action popover. Check that the popover closes and markers appear on verses
   1 and 4 while verse 2 stays unmarked.
3. Tab to a marker and press Enter. Check that the status shows its passage ID
   and the verse action popover stays closed.

The demo keeps markers in memory for the current page session.
