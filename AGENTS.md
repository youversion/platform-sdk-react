# YouVersion Platform React SDK

Type-safe YouVersion Platform SDK monorepo (pnpm workspaces + Turborepo): `@youversion/platform-core` (pure TS API clients), `@youversion/platform-react-hooks` (React data hooks), `@youversion/platform-react-ui` (UI components).

Keep this file brief. Put task-specific guidance behind a pointer.

## Gotchas
- JS bundles via tsup; `.d.ts` via `tsc` (TypeScript 7 has no compiler API). Don't assume one build shape.
- API Extractor is listed but not actually used — don't wire anything to it.
- Turbo build cache can skip changes; rebuild with `turbo build --force` when stale.
- Rebuild dependent packages after modifying core or hooks.
- Root and package `CLAUDE.md` files are symlinks to `AGENTS.md` — edit `AGENTS.md` only.
- Bible chapter HTML from the API is YVDOM, not display-ready — transform before rendering.
- Sister SDKs (`platform-sdk-swift`, `platform-sdk-kotlin`) define the Sign-In UI, logos, and i18n patterns — align with them. Swift is the source of truth for Bible reader typography.
- Local auth/highlight/Bible demos: use `examples/vite-react`, loading env vars from the monorepo root (not worktree-local envs). Navbar Sign in requests only profile and email; grant highlights via the reader permission flow (tap a verse, tap a color). Highlights are per Bible version.
- `pnpm lint` is oxlint (type-aware TypeScript, React hooks, i18n, anti-slop). Do not suppress anti-slop rules. How to run: `CONTRIBUTING.md`.

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
Bible read cache (opted-in Bible read, remaining lifetime, CachePolicy): read `docs/bible-read-cache.md`.

## Cursor Cloud
Cloud VM, env files, Vite bind, or demo startup: read `docs/cursor-cloud.md`.

## Learned User Preferences
- When posting PR review comments, use conventionalcomments.org labels. If posting on behalf of the user, identify as Cursor, an AI agent sent on behalf of Cam, in every post.
- Prefer logical CSS properties (`margin-block-end`, `padding-inline-start`) over physical ones.

## Learned Workspace Facts
- Public Bible CSS on the CDN updates automatically on UI package release.
