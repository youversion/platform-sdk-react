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
pnpm --filter vite-react dev --host 127.0.0.1 --port 5173
```

Do not put an extra `--` before `--host`. `pnpm --filter vite-react dev -- --host 127.0.0.1` becomes `vite -- --host 127.0.0.1`; Vite then ignores `--host` and listens on `localhost` (often `::1` only), so `curl http://127.0.0.1:5173` fails.

`pnpm --filter vite-react exec vite --host 127.0.0.1 --port 5173` is equivalent.

## Live core client

After `pnpm build`, source `packages/core/.env.local` into the shell before calling `@youversion/platform-core`. Test scripts load that file via `dotenv-cli`; the runtime client does not.

```bash
set -a && . packages/core/.env.local && set +a
```

Auth/highlights also need a YouVersion account and a registered redirect URL (`http://localhost:5173` for the demo). Storybook is optional (`pnpm --filter @youversion/platform-react-ui storybook`, port 6006).
