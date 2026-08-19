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

Hooks use a custom React Query-like pattern via `useApiData`:
- Returns `{ data, loading, error, refetch }`
- Provides caching and refetch capability
- New hooks should follow this same pattern

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

Follow `docs/testing.md`. This package’s flavors:

| Flavor | Use when | Avoid when |
| --- | --- | --- |
| Pure unit | Utilities (`extractTextFromHTML`, etc.) | Needs React providers |
| Hook + provider + factories | Hook state, cache, auth, refetch against stubbed core clients | Re-testing core HTTP/Zod parsing |

- Run: `pnpm --filter @youversion/platform-react-hooks test`
- Framework: Vitest (jsdom) + React Testing Library
- Mock object factories live in `__tests__/mocks`. This package does **not** use MSW — core owns request mocking
- Wrap hooks in the real provider so they see the same context as in the app; build ready-to-run wrappers via factories, not `beforeEach`
- UI tests that need stub hook results set `YouVersionContext.hookOverrides`. That seam is all-or-nothing for a mount: do not add or remove an override between renders of the same instance. This package’s own tests still stub core clients, not hook results.
