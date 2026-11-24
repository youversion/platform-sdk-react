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

## Content implementation notes

The image library follows [Swift PR #302](https://github.com/youversion/platform-sdk-swift/pull/302).
The entry point is `src/pages/ImagesPage.tsx`, with `image-*` helpers and
`use-image-results.ts` beside it. SDK packages provide the API clients and scripture rendering.

- Content language defaults to English, independently of the app's UI locale.
  Browse and passage artwork use language ranges; text search requires a resolved Bible version.
- Bible resolution respects integrator version restrictions. It prefers usable English version
  3034, then an exact language match, then the lowest-ID available candidate. Passage previews
  also require the version to contain the passage's book.
- Chinese fallbacks are `zh-CN → zh` and `zh-TW` / `zh-HK → zh-Hant → zh`.
  Missing versions produce a recoverable error without preventing artwork browsing.
- Search-hit metadata can resolve out of order or fail partially. Retain successful hits in
  server order and retry missing metadata before advancing. An empty search cursor is valid;
  only `null` ends search pagination.
- Requests reject stale results after query, language, route or active-screen changes.
  The existing client methods do not accept a per-call AbortSignal.
- Artwork taps open the viewer; horizontal drags and Next image shuffle the stack.
  Background cards are decorative, and reduced motion skips flight animations.
- Sharing sends the selected image URL rather than downloading image bytes. Native share
  failures expose a link fallback; cancellation stays silent.

## Image library browser checks

From the repository root:

```bash
pnpm exec turbo build --filter=@youversion/platform-react-ui
pnpm --filter vite-react exec playwright install chromium
pnpm --filter vite-react test:e2e
```

The Content library uses the shared hash routes and reader-command adapter. Its Read in Bible callback carries both passage ID and resolved Bible version ID.

The workflows in `e2e/images.spec.js` exercise the running app with controlled API and image
responses. They cover browsing/search, recovery and ordering, gestures, focus, and reader/history
integration. Native OS share-sheet presentation, image-feature Firefox/WebKit behavior and
continuous real-device animation smoothness need manual validation. Live API availability is
outside the mocked suite.
