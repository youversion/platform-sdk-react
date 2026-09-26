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
- **Sign in with YouVersion Button** - Authentication with YouVersion
