## OVERVIEW
Foundation package providing pure TypeScript API clients for YouVersion services with zero React dependencies.

## STRUCTURE
```
schemas/           # Zod schemas for all data types (schema-first design)
client.ts          # ApiClient - main HTTP client
bible.ts           # BibleClient - Bible data operations
languages.ts       # LanguagesClient - language data
highlights.ts      # HighlightsClient - user highlights
YouVersionAPI.ts   # Base YouVersion API client
SignInWithYouVersionPKCE.ts  # PKCE auth implementation
StorageStrategy.ts # Storage interface (SessionStorage, MemoryStorage)
```

## PUBLIC API
- `ApiClient`: Main HTTP client with auth handling
- `BibleClient`: Fetch Bibles, chapters, verses, versions
- `LanguagesClient`: Get available languages
- `HighlightsClient`: Manage user highlights
- `SignInWithYouVersionPKCE()`: PKCE auth flow function
- `SessionStorage`, `MemoryStorage`: Storage strategies

## CONVENTIONS
- Schema-first: All types defined in schemas/*.ts using Zod
- Zero React: Pure TypeScript, no React dependencies
- Storage: Abstract via StorageStrategy interface
- Auth: PKCE flow with pluggable storage backends
- Error handling: Zod validation for all API responses

## TESTING
- Framework: Vitest with Node environment
- Mocking: MSW for API endpoints
- Integration: Set `INTEGRATION_TESTS=true` for real API tests
- Coverage: @vitest/coverage-v8
- Files: Many test files covering all clients and auth
