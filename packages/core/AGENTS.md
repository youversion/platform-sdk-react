# @youversion/platform-core

## OVERVIEW
Foundation package providing pure TypeScript API clients for YouVersion services with zero React dependencies. Also provides framework-agnostic browser CSS (design tokens, preflight reset, Bible reader typography) so any web platform can render Bible content with proper styling.

**Related packages:**
- For React hooks wrapping these clients → see `packages/hooks/AGENTS.md`
- For pre-built UI components → see `packages/ui/AGENTS.md`

The public API is whatever `src/index.ts`, `src/browser.ts`, and `src/server.ts`
export. Read those rather than a list here. Browser CSS ships from `src/styles/`
and is exported via `./browser/styles/*`.

## DOs / DON'Ts

✅ Do: Keep this package **framework-agnostic**, but if you must target server or browser, those files must export from `/server` or `/browser`
✅ Do: Define all input/output types in `schemas/` using Zod; schemas are the single source of truth
✅ Do: Compose `ApiClient` in new service clients; take it as a constructor argument
✅ Do: Parse API responses with Zod schemas for validation

❌ Don't: Import React, `window`, `document`, or browser storage APIs, but if you must target the browser, those files must export from `/browser`
❌ Don't: Bypass Zod validation for API responses
❌ Don't: Implement UI, hooks, or React state here

## ENVIRONMENT-SPECIFIC EXPORTS

Three entry points, deliberately separate:

- `@youversion/platform-core` → runtime-agnostic `transformBibleHtml`, requires DOM adapters
- `@youversion/platform-core/browser` → convenience wrapper using native `DOMParser`
- `@youversion/platform-core/server` → convenience wrapper using `linkedom`

The split keeps the main export runtime-agnostic and keeps `linkedom` out of
browser bundles. New DOM-touching code follows the same pattern.

## ADDING A NEW ENDPOINT OR CLIENT

See `docs/adding-a-core-endpoint.md`.

## HTTP & CONFIGURATION

- HTTP client: Native `fetch` API
- Base client: `ApiClient` (`src/client.ts`) handles base URL, timeout, default
  headers, and response handling
- Every domain client composes `ApiClient` for consistent HTTP behavior
- `YouVersionAPI` is a separate static header helper, not a base client. Do not
  build a new client on it.

### In-flight GET deduplication

`ApiClient.get` shares one request between concurrent callers. A second `get`
for a key already in flight receives the promise the first caller is waiting on.
The key is the built URL plus the per-call headers, lowercased and sorted, so two
users with different Bearer tokens never share a promise.

- `post` and `delete` are **not** deduplicated. Only GET is idempotent.
- The map entry is deleted when the promise settles. This shares concurrency; it
  never caches a result. A GET issued after the first settles sends a new
  request.
- A shared rejection reaches every caller. Siblings fail together rather than
  independently. That is an accepted consequence, pinned by a test.
- The map is a **private per-instance field, by design**. Sharing therefore
  depends on callers holding one client. A module-level or static map was
  rejected: it would share in-flight state across independently configured
  clients and break test isolation. In React, `YouVersionProvider` owns the one
  client; see `packages/hooks/AGENTS.md`.

## CONVENTIONS
- Schema-first: All types defined in schemas/*.ts using Zod
- Zero React: Pure TypeScript, no React dependencies
- Storage: Abstract via StorageStrategy interface
- Auth: PKCE flow with pluggable storage backends
- Error handling: Zod validation for all API responses
- Browser CSS: Plain CSS only (no Tailwind, no preprocessors), served from `src/styles/` without a build step
- Two export namespaces: `"."` for TS (framework-agnostic), `"./browser"` for browser environments, and `"./server` for server environments

## TESTING

- Mocking: MSW for API endpoints
- Integration tests are guarded by `INTEGRATION_TESTS=true`. They run in CI or on
  demand only — default to mocked tests.
