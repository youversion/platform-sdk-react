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

## Reader Notes smoke test

Select verses and choose **Save** to open the Notes composer. Sign in from the
Reader when prompted, then save the passage with optional note text, visibility,
and color. The demo also exposes **Mark verses** for its local verse markers.

Run the repeatable browser smoke with a mocked YouVersion API. The script
checks the Navbar and Reader OAuth scopes, declined authorization, exact
selection resumption, cross-account invalidation, and the Notes create payload.
Run these commands from the repository root after installing Playwright Chromium.

```bash
pnpm build
VITE_YVP_APP_KEY=notes-smoke VITE_YVP_API_HOST=notes-smoke.example.test \
  VITE_YVP_AUTH_REDIRECT_URL=http://127.0.0.1:5176/callback/ VITE_YVP_LOCALE=en \
  pnpm --filter vite-react dev --port 5176 --strictPort
```

With the server running, execute `node packages/ui/scripts/smoke-vite-reader-notes.mjs`.

## Verse marker smoke test

1. Open the browser developer tools' **Network** panel, enable **Preserve log**,
   clear the log, and filter for `/notes`.
2. Reload the demo with Network recording enabled and open **Bible Reader** at
   John 1. Click the purple marker beside verse 3 and check that the status reads
   “Opened marker for JHN.1.3.”
3. Tap the text of verses 1 and 4, then choose **Mark verses** in the verse
   action popover. Check that the popover closes and markers appear on verses
   1 and 4 while verse 2 stays unmarked.
4. Tab to a marker and press Enter. Check that the status shows its passage ID
   and the verse action popover stays closed.
5. Verify that the Network panel recorded zero requests to Notes API routes.

The demo keeps markers in memory for the current page session.
