# YouVersion Platform React SDK

Type-safe YouVersion Platform SDK monorepo (pnpm workspaces + Turborepo): `@youversion/platform-core` (pure TS API clients), `@youversion/platform-react-hooks` (React data hooks), `@youversion/platform-react-ui` (UI components).

Keep this file brief. Put task-specific guidance behind a pointer.

## Gotchas
- Build tools differ per package: core = tsup, hooks = tsc only, ui = tsup + tsc. Don't assume one build shape.
- API Extractor is listed but not actually used — don't wire anything to it.
- Turbo build cache can skip changes; rebuild with `turbo build --force` when stale.
- Rebuild dependent packages after modifying core or hooks.
- Root and package `CLAUDE.md` files are symlinks to `AGENTS.md` — edit `AGENTS.md` only.
- Bible chapter HTML from the API is YVDOM, not display-ready — transform before rendering.
- Sister SDKs (`platform-sdk-swift`, `platform-sdk-kotlin`) define the Sign-In UI, logos, and i18n patterns — align with them.
- Local auth/highlight/Bible demos: use `examples/vite-react`, loading env vars from the monorepo root (not worktree-local envs).

## Guardrails
- Dependency chain runs one way: core → hooks → ui. Never introduce a reverse dependency.

## Packages
Package-specific guidance: read `packages/core/AGENTS.md`, `packages/hooks/AGENTS.md`, or `packages/ui/AGENTS.md`.

## Testing
Testing or coverage: read `docs/testing.md`.

## Release
Release, versioning, or publishing: read `PUBLISHING.md`; decisions live in `docs/release-hardening-decisions.md`.

## Domain
Domain terms (highlight, passage, Bible version, auth flow): read `CONTEXT.md`.

## Cursor Cloud specific instructions

This repo is an SDK monorepo, not a backend. There is no Docker Compose, database, or local API to start. The only long-running process for a product walkthrough is the Vite demo (`examples/vite-react`), which talks to the hosted YouVersion Platform API.

Standard install/lint/test/build/dev commands live in `CONTRIBUTING.md` and root `package.json`. Prefer those over reinventing them.

### Env files (gitignored)

Core unit tests use MSW but still fail if `YVP_API_HOST` is unset (`packages/core/src/__tests__/handlers.ts`). Copy the examples before `pnpm test`:

- `packages/core/.env.example` → `packages/core/.env.local` (`YVP_API_HOST=api.youversion.com`; a placeholder `YVP_APP_KEY` is enough for mocked tests)
- `packages/ui/.env.example` → `packages/ui/.env.local` (Storybook)
- `examples/vite-react/.env.example` → `examples/vite-react/.env.local` (`VITE_YVP_APP_KEY` required for live Bible content)

Get a real app key from https://platform.youversion.com. Without `VITE_YVP_APP_KEY`, the demo renders the SDK missing-app-key panel instead of the Bible reader.

### Running the demo

`pnpm dev:web` is stale (it still filters a removed `nextjs` package). Start the demo with:

```bash
pnpm --filter vite-react exec vite --host 127.0.0.1 --port 5173
```

`pnpm --filter vite-react dev -- --host 127.0.0.1` does **not** bind IPv4: pnpm already inserts `--`, so Vite sees `-- --host` and listens on `::1` only. `curl http://127.0.0.1:5173` then fails even though `http://localhost:5173` works.

After `pnpm build`, a real `YVP_APP_KEY` lets you call `@youversion/platform-core` from `packages/core` (dotenv loads `.env.local`) to fetch versions and a passage such as `JHN.3.16`. Auth/highlights also need a YouVersion account and a registered redirect URL (`http://localhost:5173` for the demo). Storybook is optional (`pnpm --filter @youversion/platform-react-ui storybook`, port 6006).
