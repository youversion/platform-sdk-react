# Bible read cache

Opted-in Bible reads honor Cache-Control remaining lifetime in a memory-only QueryClient.

This map is the how and where. ADR 0006 is the why. This is not YPE-5262.

## Tower

1. The Platform API returns Cache-Control and Age on GET bodies.
2. `parseCachePolicy` in core turns headers into CachePolicy (`remainingMs`, `allowsCaching`).
   Missing max-age is 7 days.
   Missing Age is 0.
   `no-cache` / `no-store` set remainingMs 0.
   Parse errors fail open to no cache.
3. `ApiClient.get` stays body-only.
   `getWithPolicy` returns `{ data, policy }`.
4. BibleClient methods for an opted-in Bible read call getWithPolicy.
   Public body-only wrappers stay.
5. Opted-in Bible read hooks pass getWithPolicy into useApiData.
   useApiData writes remainingMs onto that query's staleTime and gcTime after a successful first fetch.
   The write covers the live query, not only setQueryDefaults.
6. Public hook shape stays `{ data, loading, error, refetch }`.
   No TanStack types leave the package.
7. QueryClient is private, memory-only, and one per YouVersionProvider.
   Expo DOM WebViews do not share this memory.
   This is not YPE-5262.

## Opt-in

An opted-in Bible read is GET `/v1/bibles/{id}` or a subpath of that id:

- version
- book
- books
- chapter
- chapters
- verse
- verses
- passage

These stay out:

- highlights
- GET `/v1/bibles` versions list
- VOTD
- languages
- organizations
- theme
- auth

## Contracts

| Event | Result |
| --- | --- |
| remount inside remaining lifetime | cache hit, no fetch |
| remount after remaining lifetime | miss, fetch |
| still-mounted observer after expiry | keep showing the body (focus refetch is off) |
| no-cache / no-store | write while mounted with gcTime 0 so the still-mounted observer can keep the body; remount misses |
| refetch() | always fetches |
| default hooks | staleTime 0, gcTime 5 minutes |

## Fence

Do not use this layer as the React Native Expo disk cache.
Do not persist QueryClient.
Do not share one QueryClient across Expo WebViews.
Do not wrap window.fetch in the Web SDK to close YPE-5262.

## File ownership

| Package | Owns |
| --- | --- |
| core | `parse-cache-policy.ts`, client getWithPolicy, bible.ts `*WithPolicy` methods, MSW tests for HTTP+parse |
| hooks | useApiData envelope, opted-in hook method swap, remount tests |
| ui | no cache policy code |
| Expo SDK | out of this repo |

Hooks do not re-test parse tables.

### Files

core:

- `packages/core/src/parse-cache-policy.ts`
- `packages/core/src/parse-cache-policy.test.ts` (Kotlin/Swift parity table)
- `packages/core/src/client.ts` (`get`, `getWithPolicy`)
- `packages/core/src/bible.ts` (`*WithPolicy` twins)
- `packages/core/src/__tests__/client.test.ts`
- `packages/core/src/__tests__/bible.test.ts`

hooks:

- `packages/hooks/src/useApiData.ts`
- `packages/hooks/src/useApiData.test.tsx`
- `packages/hooks/src/useVersion.ts` and `useVersion.test.tsx`
- `packages/hooks/src/usePassage.ts` and `usePassage.test.tsx`
- other opted-in Bible read hooks: `useBook.ts`, `useBooks.ts`, `useChapter.ts`, `useChapters.ts`, `useVerse.ts`, `useVerses.ts`
- `packages/hooks/src/context/YouVersionProvider.tsx` (one memory-only QueryClient)
- `packages/hooks/src/internal/queryClientDefaults.ts`

ui has no cache policy code.

Kotlin and Swift parse the same way. The parity table is `packages/core/src/parse-cache-policy.test.ts`.

## Agent control

If you add a new Bible GET hook, opt it in only when the path is under `/v1/bibles/{id}`.

If you change `parseCachePolicy`, update the Kotlin/Swift parity table in `parse-cache-policy.test.ts` and this map.

If you change remount behavior, update useApiData / useVersion / usePassage remount tests and this map.

ADR 0006 stays the why. This map is the how and where.
