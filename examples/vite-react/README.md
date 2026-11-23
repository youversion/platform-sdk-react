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

## Demo map

The top bar has four destinations: Bible, Content, Examples, and Profile. Screens use a hash (`#/bible`) so a subpath deploy and an OAuth query stay on the URL. Back and Forward restore the screen. A screen mounts the first time you open it, then stays mounted so the reader, image list, and search fields survive a round trip.

- **Bible** — full reader. Chapter, version, and font remain when you leave.
- **Content** — Browse and search verse images by language, shuffle passage artwork, open scripture previews, and share the selected image. Detail is `#/content/image/<id>`.
- **Examples** — Navigation, Verse of the Day, Bible Card, and Unified Search.
- **Profile** — sign in (profile and email), account, and theme.

Navigation presets and an image's Read in Bible action open that passage in Bible. The image action uses the Bible version resolved for its content language and asks for the full chapter.

## Image library browser checks

From the repository root:

```bash
pnpm exec turbo build --filter=@youversion/platform-react-ui
pnpm --filter vite-react exec playwright install chromium
pnpm --filter vite-react test:e2e
```

The Content library uses the shared hash routes and reader-command adapter. Its Read in Bible callback carries both passage ID and resolved Bible version ID.
