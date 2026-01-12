# @youversion/platform-react-hooks

## OVERVIEW
React integration layer providing data fetching hooks with 3 core providers: YouVersionProvider, YouVersionAuthProvider, and ReaderProvider.

**Depends on `@youversion/platform-core` for all API calls.** Hooks delegate to core clients; do not implement raw HTTP here.

## STRUCTURE
- `use*.ts` - Data fetching hooks (useBook, useChapter, usePassage, useVersion, etc.)
- `context/` - Providers and contexts (separate files, exported via index.ts)
- `utility/` - Helper functions (useDebounce, extractTextFromHTML, extractVersesFromHTML)

## PUBLIC API
- Data fetching hooks: useBook, useChapter, usePassage, useVersion, useVOTD, useVerse, useChapterNavigation, etc.
- YouVersionProvider - Core SDK configuration
- YouVersionAuthProvider - Authentication state
- ReaderProvider - Reading session context
- Utility functions exported from utility/index

## PROVIDERS

- **YouVersionProvider**
  - Holds core SDK configuration (API base URL, clients)
  - Wrap this around your app before using any data hooks

- **YouVersionAuthProvider**
  - Manages authentication state (userInfo, tokens, isLoading, error)
  - Auth hooks like `useYVAuth` depend on this provider

- **ReaderProvider**
  - Manages Bible reading session state (currentVersion, currentChapter, currentBook, currentVerse)
  - Hooks like `useChapterNavigation` depend on this provider

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

## TESTING

- Run tests: `pnpm --filter @youversion/platform-react-hooks test`
- Framework: Vitest with jsdom environment
- React Testing Library for component/hook tests
- Mock APIs live in `__tests__/mocks`
- Use provider wrappers for tests so hooks see the same context as in the app
