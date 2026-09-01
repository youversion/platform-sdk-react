# @youversion/platform-react-hooks

## OVERVIEW
React integration layer providing data fetching hooks with 2 core providers: YouVersionProvider and YouVersionAuthProvider.

**Depends on `@youversion/platform-core` for all API calls.** Hooks delegate to core clients; do not implement raw HTTP here.

**Related packages:**
- For lower-level API clients → see `packages/core/AGENTS.md`
- For pre-built UI components → see `packages/ui/AGENTS.md`

The public API is whatever `src/index.ts` exports. Hooks live in `src/use*.ts`,
providers and contexts in `src/context/`, helpers in `src/utility/`.

## PROVIDERS

- **YouVersionProvider**
  - Holds core SDK configuration (API base URL, clients)
  - Wrap this around your app before using any data hooks

- **YouVersionAuthProvider**
  - Manages authentication state (userInfo, tokens, isLoading, error)
  - Auth hooks like `useYVAuth` depend on this provider

## DOs / DON'Ts

✅ Do: Use `YouVersionProvider` for configuration and access that config in hooks
✅ Do: Wrap async data access in hooks rather than calling core clients directly in components
✅ Do: Keep hooks **UI-agnostic** (no JSX returned, no direct DOM manipulation)
✅ Do: Use the `useApiData` pattern for new data fetching hooks

❌ Don't: Import components from `@youversion/platform-react-ui`
❌ Don't: Talk directly to `fetch`/HTTP; always use `@youversion/platform-core`
❌ Don't: Access `window.localStorage` directly for auth; rely on core's storage abstractions

## DATA FETCHING PATTERN

Data hooks go through `useApiData`, which is backed by TanStack Query
(`@tanstack/react-query`, a direct dependency — exact-pinned; bumps must clear
the pnpm `minimumReleaseAge` window):
- Returns `{ data, loading, error, refetch }` — never TanStack Query types.
  The QueryClient is private to `YouVersionProvider`; export no TQ surface.
- Call as `useApiData([...useQueryKeyBase(), '<hookName>', ...params], fetchFn)`.
  Key segments must be serializable (no class instances). Account-scoped hooks
  (e.g. `useHighlights`) also append `useUserScope()` **and** pass
  `keepPreviousData: false` so users never see each other's cached data.
  `useUserScope()` returns `null` when the account is not identified yet — set
  `enabled: false` for that render, because an unidentified account has no key
  of its own and two of them would share one cache entry.
- `useOrganizations` is the one hook that reaches TanStack Query directly:
  `useApiData` wraps a single `useQuery`, and a batch needs one query per id.
  It calls `useQueries` with one entry per id, keyed
  `[...useQueryKeyBase(), 'organization', <id>]` — the key `useOrganization`
  builds — so the two hooks share cache entries and only ids the cache does
  not hold reach the network. Its `combine` callback has a stable identity, so
  TanStack Query memoizes it and the returned Map stays referentially stable.
  No TanStack Query type reaches its public surface. New hooks use `useApiData`.
- Cache is memory-only; `refetch` performs exact query invalidation. Writes
  stay outside this layer (the highlights machine owns them) and refresh via
  `refetch` after the write.
- Opted-in Bible reads (version, book, books, chapter, chapters, verse,
  verses, passage) call `useApiData(..., { cacheControl: true })` with
  `bibleClient.readWithPolicy` so the fetch is typed as `{ data, policy }`.
  They may serve from memory until remaining Cache-Control lifetime ends.
  Remount after expiry fetches. Highlights, the versions list, and VOTD
  keep a bare `T` (default-fresh): `staleTime: 0` and revalidate on remount.
- Design decisions: `docs/adr/0006-tanstack-query-read-layer.md`.

## CONVENTIONS
- Context and Provider in separate files
- All contexts exported via context/index.ts
- TypeScript declarations generated separately (no bundling)
- Build: tsup JS + tsc dts

## REFERENCES

For working usage, read `examples/vite-react` at the repo root — it is
type-checked and stays current. Each hook's own props type is the authoritative
signature.

## TESTING

Follow `docs/testing.md`. This package’s flavors:

| Flavor | Use when | Avoid when |
| --- | --- | --- |
| Pure unit | Utilities (`extractTextFromHTML`, etc.) | Needs React providers |
| Hook + provider + factories | Hook state, cache, auth, refetch against stubbed core clients | Re-testing core HTTP/Zod parsing |

- Run: `pnpm --filter @youversion/platform-react-hooks test`
- Framework: Vitest (jsdom) + React Testing Library
- Mock object factories live in `__tests__/mocks`. This package does **not** use MSW — core owns request mocking
- Wrap hooks in the real provider so they see the same context as in the app; build ready-to-run wrappers via factories, not `beforeEach`
- UI tests that need stub hook results set `YouVersionContext.hookOverrides`. Data hooks still call their inner hooks; fetch is skipped with `enabled: !override`. Do not add or remove an override between renders of the same instance. This package’s own tests still stub core clients, not hook results.
