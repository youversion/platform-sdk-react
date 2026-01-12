# @youversion/platform-react-hooks

## OVERVIEW
React integration layer providing many data fetching hooks with 3 core providers: YouVersionProvider, YouVersionAuthProvider, and ReaderProvider.

## STRUCTURE
- `use*.ts` - Data fetching hooks (useBook, useChapter, usePassage, useVersion, etc.)
- `context/` - Providers and contexts (separate files, exported via index.ts)
- `utility/` - Helper functions (useDebounce, extractTextFromHTML, extractVersesFromHTML)

## PUBLIC API
- Data fetching hooks: useBook, useChapter, usePassage, useVersion, etc.
- YouVersionProvider - Core SDK configuration
- YouVersionAuthProvider - Authentication state
- ReaderProvider - Reading session context
- Utility functions exported from utility/index

## CONVENTIONS
- Context and Provider in separate files
- All contexts exported via context/index.ts
- TypeScript declarations generated separately (no bundling)
- Build: tsc only

## TESTING
- Vitest with jsdom environment
- React Testing Library for component tests
- Many test files covering hooks and providers
