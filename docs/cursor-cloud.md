# Cursor Cloud

This repo is an SDK monorepo, not a backend. There is no Docker Compose, database, or local API to start. The only long-running process for a product walkthrough is the Vite demo (`examples/vite-react`), which talks to the hosted YouVersion Platform API.

Standard install/lint/test/build/dev commands live in `CONTRIBUTING.md` and root `package.json`.

## Env files (gitignored)

Core unit tests use MSW but still throw if `YVP_API_HOST` is unset (`packages/core/src/__tests__/handlers.ts`). Copy the examples before `pnpm test`:

- `packages/core/.env.example` → `packages/core/.env.local` (`YVP_API_HOST=api.youversion.com`; a placeholder `YVP_APP_KEY` is enough for mocked tests)
- `packages/ui/.env.example` → `packages/ui/.env.local` (Storybook)
- `examples/vite-react/.env.example` → `examples/vite-react/.env.local` (`VITE_YVP_APP_KEY` required for live Bible content)

Get a real app key from https://platform.youversion.com. Without `VITE_YVP_APP_KEY`, the demo renders the SDK missing-app-key panel instead of the Bible reader.

## Running the demo

`pnpm dev:web` is stale (it still filters a removed `nextjs` package). Start the demo with:

```bash
pnpm --filter vite-react exec vite --host 127.0.0.1 --port 5173
```

`pnpm --filter vite-react dev -- --host 127.0.0.1` does not bind IPv4: pnpm already inserts `--`, so Vite sees `-- --host` and listens on `::1` only. `curl http://127.0.0.1:5173` then fails even though `http://localhost:5173` works.

After `pnpm build`, a real `YVP_APP_KEY` lets you call `@youversion/platform-core` from `packages/core` (dotenv loads `.env.local`) to fetch versions and a passage such as `JHN.3.16`. Auth/highlights also need a YouVersion account and a registered redirect URL (`http://localhost:5173` for the demo). Storybook is optional (`pnpm --filter @youversion/platform-react-ui storybook`, port 6006).
