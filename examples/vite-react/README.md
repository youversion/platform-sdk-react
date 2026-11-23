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
- **Content** — Images list and detail for `JHN.3.16`. Detail is `#/content/image/<id>`.
- **Examples** — Navigation, Verse of the Day, Bible Card, and Unified Search.
- **Profile** — sign in (profile and email), account, and theme.

Navigation presets and an image's Read in Bible action open that passage in Bible. The image action uses sample version 3034 and asks for the full chapter.
