# @youversion/platform-react-hooks

## OVERVIEW
React integration layer providing data fetching hooks with 3 core providers: YouVersionProvider, YouVersionAuthProvider, and ReaderProvider.

**Depends on `@youversion/platform-core` for all API calls.** Hooks delegate to core clients; do not implement raw HTTP here.

**Related packages:**
- For lower-level API clients → see `packages/core/AGENTS.md`
- For pre-built UI components → see `packages/ui/AGENTS.md`

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

## USAGE EXAMPLES

### Provider Setup (Required)

```tsx
// Wrap your app with YouVersionProvider before using any hooks
import { YouVersionProvider } from '@youversion/platform-react-hooks';

function App() {
  return (
    <YouVersionProvider
      appKey="your-app-key"
      theme="light"                      // "light" | "dark"
    >
      <MyApp />
    </YouVersionProvider>
  );
}

// With authentication enabled
function AppWithAuth() {
  return (
    <YouVersionProvider
      appKey="your-app-key"
      includeAuth={true}
      authRedirectUrl="https://myapp.com/callback"
    >
      <MyApp />
    </YouVersionProvider>
  );
}
```

### Data Fetching Hooks

All data hooks return `{ data, loading, error, refetch }`:

```tsx
import { useChapter, useVersion, useVerseOfTheDay } from '@youversion/platform-react-hooks';

// Fetch a Bible chapter
function ChapterView() {
  const { chapter, loading, error } = useChapter(
    111,      // versionId (e.g., 111 = NIV)
    'JHN',    // book (USFM abbreviation)
    3         // chapter number
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{chapter?.content}</div>;
}

// Fetch Bible version metadata
function VersionInfo() {
  const { version, loading } = useVersion(111);
  if (loading) return <div>Loading...</div>;
  return <div>{version?.name} ({version?.abbreviation})</div>;
}

// Fetch Verse of the Day
function DailyVerse() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const { data: votd, loading, refetch } = useVerseOfTheDay(dayOfYear);

  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <p>{votd?.verse.text}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Authentication Hook

```tsx
import { useYVAuth } from '@youversion/platform-react-hooks';

function AuthExample() {
  const { auth, userInfo, signIn, signOut } = useYVAuth();

  if (auth.isLoading) return <div>Loading...</div>;

  if (!auth.isAuthenticated) {
    return (
      <button onClick={() => signIn({ redirectUrl: window.location.origin + '/callback' })}>
        Sign In with YouVersion
      </button>
    );
  }

  return (
    <div>
      <p>Welcome, {userInfo?.name}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Conditional Fetching

```tsx
// Use the `enabled` option to conditionally fetch
function ConditionalFetch({ versionId }: { versionId: number | null }) {
  const { version, loading } = useVersion(versionId ?? 0, {
    enabled: versionId !== null,  // Only fetch when versionId is provided
  });

  // ...
}
```

## TESTING

- Run tests: `pnpm --filter @youversion/platform-react-hooks test`
- Framework: Vitest with jsdom environment
- React Testing Library for component/hook tests
- Mock object factories live in `__tests__/mocks` (not MSW - hooks delegate HTTP to core)
- Use provider wrappers for tests so hooks see the same context as in the app
