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
  - Optional `timeout` prop, in milliseconds, sets the per-request timeout on
    `ApiClient`. It defaults to 10000. A request that passes it rejects with
    `Request timeout after {timeout}ms`.

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

Hooks use a custom React Query-like pattern via `useApiData`:
- Returns `{ data, loading, error, refetch }`
- Holds no response cache. Concurrent GETs for the same URL share one request in
  core; see `packages/core/AGENTS.md`.
- New hooks should follow this same pattern

### Automatic retry

`useApiData` retries a failed request on its own. The policy lives in
`src/internal/retry-policy.ts`.

- Retries a timeout, a transport failure, a 429, and a 5xx.
- Does not retry a 401, a 403, a 404, or a `ZodError`.
- Budget: at most `DEFAULT_MAX_RETRIES` (2) extra attempts **and** a
  `DEFAULT_RETRY_BUDGET_MS` (20 seconds) wall clock, whichever runs out first.
- Backoff is jittered (`Math.random() * base`, base 500 then 1500), so a fanout
  of siblings that failed together does not retry in lockstep.
- `loading` stays `true` for the whole chain. It settles on success or on final
  failure only. Do not add a `.finally()` that settles it per attempt, or the
  two-tier reader spinner flickers.
- Every attempt re-checks the `requestSeqRef` ticket before it writes state, and
  again inside the backoff timer. A chapter change or an unmount mid-backoff
  cancels the chain.
- `retry: false` restores single-shot behavior for a poll or a
  fire-and-forget read.

The 20-second budget is **fixed on purpose**. It is not derived from the
provider `timeout`. An integrator who sets `timeout` at or above 20000 gets
single-shot behavior, which is what the SDK did before retry existed, so nothing
regresses. Do not couple the two values.

### One `ApiClient` per `YouVersionProvider`

`YouVersionProvider` builds the single `ApiClient` for its tree and puts it on
the context. `useApiClient` reads it from there. **Never build the `ApiClient`
inside `useApiClient` or inside a data hook.**

The reason: `ApiClient` deduplicates concurrent GETs through a `Map` that is a
private per-instance field. A `useMemo` inside `useApiClient` runs per hook
instance, so every component calling `useBooks` gets its own client, its own map,
and no sharing. That defect shipped once and is easy to reintroduce, because the
core tests pass either way — they exercise one client instance directly, which is
the wrong altitude to see it. `src/internal/useApiClient.dedupe.test.tsx` is the
regression guard: sibling hooks under one provider must produce one `fetch` call.

One deliberate exception. `useApiClient` keeps a `useMemo` fallback that builds a
per-hook client when the context carries none, because a consumer may render the
exported `YouVersionContext.Provider` by hand. That path works but shares no
in-flight requests. Removing it would be a breaking change.

## CONVENTIONS
- Context and Provider in separate files
- All contexts exported via context/index.ts
- TypeScript declarations generated separately (no bundling)
- Build: tsc only

## REFERENCES

For working usage, read `examples/vite-react` at the repo root — it is
type-checked and stays current. Each hook's own props type is the authoritative
signature.

## TESTING

- Mock object factories live in `__tests__/mocks`. This package does **not** use
  MSW — hooks delegate HTTP to core, so core owns the request mocking.
- Wrap hooks in the real provider in tests so they see the same context as in the app.
