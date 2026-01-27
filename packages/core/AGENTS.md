# @youversion/platform-core

## OVERVIEW
Foundation package providing pure TypeScript API clients for YouVersion services with zero React dependencies.

**Related packages:**
- For React hooks wrapping these clients → see `packages/hooks/AGENTS.md`
- For pre-built UI components → see `packages/ui/AGENTS.md`

## STRUCTURE
```
schemas/                     # Zod schemas for all data types (schema-first design)
client.ts                    # ApiClient - main HTTP client
bible.ts                     # BibleClient - Bible data operations
languages.ts                 # LanguagesClient - language data
highlights.ts                # HighlightsClient - user highlights
YouVersionAPI.ts             # Base YouVersion API client
SignInWithYouVersionPKCE.ts  # PKCE auth implementation
StorageStrategy.ts           # Storage interface (SessionStorage, MemoryStorage)
```

## PUBLIC API
- `ApiClient`: Main HTTP client with auth handling
- `BibleClient`: Fetch Bibles, chapters, verses, versions
- `LanguagesClient`: Get available languages
- `HighlightsClient`: Manage user highlights
- `SignInWithYouVersionPKCE()`: PKCE auth flow function
- `SessionStorage`, `MemoryStorage`: Storage strategies

## DOs / DON'Ts

✅ Do: Keep this package **framework-agnostic** (no React, no DOM, no browser-only APIs)
✅ Do: Define all input/output types in `schemas/` using Zod; schemas are the single source of truth
✅ Do: Reuse `YouVersionAPI` base client for new service clients
✅ Do: Parse API responses with Zod schemas for validation

❌ Don't: Import React, `window`, `document`, or browser storage APIs directly
❌ Don't: Bypass Zod validation for API responses
❌ Don't: Implement UI, hooks, or React state here

## ADDING A NEW ENDPOINT OR CLIENT

1. **Define types** in `schemas/` using Zod:
   - Request payload schema
   - Response schema
2. **Extend or add a client**:
   - Prefer extending existing clients (e.g., `BibleClient`) when the endpoint logically belongs there
   - Otherwise, create `xyz.ts` with a new `XyzClient` that composes `YouVersionAPI`
3. **Wire validation**:
   - Parse API responses with the corresponding Zod schema
   - Throw or return typed errors on validation failure
4. **Export from public API**:
   - Expose the new client/types from the main entry file so consumers can import them
5. **Add tests**:
   - Unit tests with MSW for mock responses
   - Optional integration tests guarded by `INTEGRATION_TESTS=true`

## HTTP & CONFIGURATION

- HTTP client: Native `fetch` API
- Base client: `YouVersionAPI` handles base URL, headers, auth tokens
- All clients extend or compose `YouVersionAPI` for consistent HTTP behavior

## CONVENTIONS
- Schema-first: All types defined in schemas/*.ts using Zod
- Zero React: Pure TypeScript, no React dependencies
- Storage: Abstract via StorageStrategy interface
- Auth: PKCE flow with pluggable storage backends
- Error handling: Zod validation for all API responses

## TESTING

- Run tests: `pnpm --filter @youversion/platform-core test`
- Framework: Vitest with Node environment
- Mocking: MSW for API endpoints
- Integration tests:
  - Guarded by `INTEGRATION_TESTS=true`
  - Only run in CI or when explicitly needed; default to mocked tests
- Coverage: @vitest/coverage-v8
