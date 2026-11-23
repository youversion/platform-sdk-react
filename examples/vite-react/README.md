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
- **Images** — Browse and search verse artwork by language, shuffle passage images, open scripture previews, and share the selected image. Main Bible navigation awaits YPE-6574.
- **Sign in with YouVersion Button** - Authentication with YouVersion

## Image library browser checks

From the repository root, build dependencies and run the local HTTP/CDN-fixture workflows:

```bash
pnpm exec turbo build --filter=@youversion/platform-react-ui
pnpm --filter vite-react exec playwright install chromium
pnpm --filter vite-react test:e2e
```

The library exposes `ImagesPage.onReadInBible(passageId, versionId)` for the upcoming Content navigation. Without that callback, Read in Bible stays disabled.
