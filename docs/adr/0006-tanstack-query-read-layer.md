# 6. TanStack Query backs the read layer

Date: 2026-08-24

## Status

Accepted

## Context

`useApiData` was a hand-rolled effect: every mount and every dep change refetched, nothing was cached, and disabling a query threw its data away. Revisiting a chapter re-blanked the reader; account data was cleared imperatively on auth changes, which is easy to get wrong once and leak one user's highlights to another. The full design and contract mapping live in `docs/tanstack-query-read-layer-plan.md`.

## Decision

Rewrite `useApiData` on TanStack Query v5, exact-pinned (`5.101.4`, no caret) as a direct dependency of `@youversion/platform-react-hooks`. The `QueryClient` is private: created inside `YouVersionProvider` (one per provider instance, `retry: false`), never accepted as a prop, never exported. `useApiData` takes an explicit query key; key bases come from provider config via `useQueryKeyBase`, and account-scoped hooks (`useHighlights`) add a user segment from `useUserScope` (`userId` or `'anon'`). The public hook contract — `{ data, loading, error, refetch }` — is unchanged; nothing TanStack-shaped is exported.

## Why

- **Direct dep, not peer.** A peer would push an infrastructure choice onto every consumer and invite version skew against our compat mapping. Exact pin: the mapping (`isPending`, masking, invalidation) is version-sensitive, and the repo's 3-day `minimumReleaseAge` makes floating ranges a supply-chain surface.
- **Private client.** Exposing the client (or accepting the host's) makes our query keys public API and lets a host's defaults (retries, persisters) rewrite our semantics. Cost accepted: an app already using TanStack Query carries a second client and cache copy — bounded, memory-only.
- **User-scoped keys, not imperative clearing.** With the user id in the key, serving one account's rows to another is structurally impossible and switch-back restores the previous account's cache instantly. Clearing on auth transitions had to be remembered at every transition; keys cannot be forgotten.
- **`retry: false`.** The pre-TQ layer never retried; TQ's default (3 retries with backoff) would delay error surfacing behind partner-visible repeat traffic.

## Consequences

Revisits render from cache with background revalidation; disabled queries mask (`data: null`) rather than drop their cache entry. Accepted behavioral deltas: (1) no stale data across a key change — the fresh key starts at `null` instead of showing the previous key's data; (2) `refetch` with cached data no longer flips `loading` — data updates in place (the ui integration suites pass on plain `isPending`; the `isFetching` fallback was not needed); (3) a failed background revalidate surfaces `error` while cached `data` stays non-null; (4) `refetchOnWindowFocus` adds revalidation traffic; (5) default `gcTime` (5 min) bounds how long "instant revisit" holds. Test seams that render `YouVersionContext.Provider` raw must also mount a `QueryClientProvider` (`TestQueryClientProvider` in each package's test utils). The referential-stability workaround in `use-bible-reader-highlights.ts` (holding the previous parsed `serverColors` reference across byte-identical refetches) became redundant — structural sharing keeps the `highlights` reference stable — and was removed in the same change.
