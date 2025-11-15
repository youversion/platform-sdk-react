![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)
![React >= 19.0.0](https://img.shields.io/badge/React-%3E%3D%2019.0.0-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## Table of Contents

- [@youversion/platform-react-hooks](#youversionplatform-react-hooks)
  - [Overview](#overview)
  - [Installation](#installation)
  - [When to Use This Package](#when-to-use-this-package)
  - [Related Packages](#related-packages)
  - [Setup: Provider Configuration](#setup-provider-configuration)
  - [Quick Start](#quick-start)
  - [Features and Capabilities](#features-and-capabilities)
  - [API Reference](#api-reference)
    - [Core Hooks](#core-hooks)
    - [Bible Content Hooks](#bible-content-hooks)
    - [Language Hooks](#language-hooks)
    - [Context Providers](#context-providers)
  - [Troubleshooting](#troubleshooting)
  - [Development](#development)
  - [License](#license)
  - [Support](#support)

# @youversion/platform-react-hooks

A comprehensive collection of React hooks for accessing the YouVersion Platform APIs. Build Bible-based applications with type-safe hooks that handle loading states, error handling, and data fetching automatically.

## Overview

`@youversion/platform-react-hooks` provides React hooks that wrap the [`@youversion/platform-core`](../../packages/core/README.md) SDK, offering a declarative way to access Bible data and user features in your React applications.

Key features include:
- Automatic loading and error state management
- Type-safe hooks with TypeScript support
- Context providers for easy configuration
- Memoized data fetching to prevent unnecessary requests
- Support for conditional fetching with `enabled` option

Built specifically for React 19+ with modern hooks patterns and full TypeScript support.

## Installation

Install the package from npm:

```bash
npm install @youversion/platform-react-hooks
```

Or with pnpm:

```bash
pnpm add @youversion/platform-react-hooks
```

Or with yarn:

```bash
yarn add @youversion/platform-react-hooks
```

### Peer Dependencies

This package requires React 19.0.0 or higher as a peer dependency:

```bash
pnpm install react@19.0.0
```

## When to Use This Package

Use `@youversion/platform-react-hooks` when you need:
- ✅ Building custom React components with Bible features
- ✅ Declarative data fetching with automatic loading/error states
- ✅ Control over component UI while using reusable hooks
- ✅ Integration with existing React component libraries
- ✅ Server-side rendering compatible hooks (recommended for most React apps)

**Use other packages instead if:**
- ❌ Need direct API access → Use `@youversion/platform-core` for low-level client
- ❌ Want ready-made UI → Use `@youversion/platform-react-ui` for production components

## Related Packages

This package provides React hooks wrapping the core SDK. Depending on your use case, you may want to consider related packages:

- **[@youversion/platform-core](../../packages/core/README.md)** - Core TypeScript SDK for direct API access (this hooks package depends on it)
- **[@youversion/platform-react-ui](../../packages/ui/README.md)** - Pre-built React components for common Bible features

For complete parameter and configuration documentation, see the [Core SDK API Reference](../../packages/core/README.md#configuration).

## Setup: Provider Configuration

All hooks in this package require the `BibleSDKProvider` to be wrapped around your application or component subtree. This provider initializes the API client and context required by all hooks.

### BibleSDKProvider (Required)

The `BibleSDKProvider` is the foundation for all hooks. It requires your YouVersion Platform App Key:

```tsx
import { BibleSDKProvider } from '@youversion/platform-react-hooks';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      {/* All hooks work here */}
    </BibleSDKProvider>
  );
}
```

### Optional Providers

For advanced use cases, additional providers can be nested:

- **`ReaderProvider`** - Manages reader state for building custom Bible readers
- **`VerseSelectionProvider`** - Manages verse selection state

These are typically used when building custom reading experiences:

```tsx
import { BibleSDKProvider, ReaderProvider, VerseSelectionProvider } from '@youversion/platform-react-hooks';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <ReaderProvider>
        <VerseSelectionProvider>
          {/* Custom reader component here */}
        </VerseSelectionProvider>
      </ReaderProvider>
    </BibleSDKProvider>
  );
}
```

> **⚠️ Missing Provider Error:** If you use a hook without wrapping it in `BibleSDKProvider`, you'll get: `Error: useBibleClient must be used within a BibleSDKProvider`. Always ensure providers wrap your component tree.

## Quick Start

### Basic Setup

> [!important]
> While this is an example of how to use the `usePassage` hook, we recommend using the `BibleVerseText` component in the `@youversion/platform-react-ui` package for proper verse formatting that honors the Bible Publishers intended way to display the Bible text. 

```tsx
import React, { ReactNode } from 'react';
import { BibleSDKProvider, useVersion, usePassage } from '@youversion/platform-react-hooks';

function BibleVerse() {
  const { version, loading: versionLoading, error: versionError } = useVersion(111);
  const { passage, loading: passageLoading, error: passageError } = usePassage(111, 'JHN.3.16');

  if (versionLoading || passageLoading) return <div>Loading...</div>;
  
  if (versionError) return <div>Version Error: {versionError.message}</div>;
  if (passageError) return <div>Passage Error: {passageError.message}</div>;

  return (
    <div>
      <h1>{passage?.human_reference}</h1>
      <p>Version: {version?.abbreviation}</p>
      {/* We recommend using the BibleVerseText component in our @youversion/platform-react-ui package instead of this example approach */}
      <div dangerouslySetInnerHTML={{ __html: passage?.content || '' }} />
    </div>
  );
}

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <BibleVerse />
    </BibleSDKProvider>
  );
}

export default App;
```

### Error Handling and Loading States

```tsx
import { useVersions } from '@youversion/platform-react-hooks';

function VersionList() {
  const { versions, loading, error, refetch } = useVersions('en');

  if (loading) return <div>Loading versions...</div>;
  
  if (error) {
    return (
      <div>
        <p>Error loading versions: {error.message}</p>
        <button onClick={refetch}>Try Again</button>
      </div>
    );
  }

  return (
    <ul>
      {versions?.data.map((version) => (
        <li key={version.id}>{version.title}</li>
      ))}
    </ul>
  );
}
```

## Features and Capabilities

### Bible Data Access
- Fetch Bible versions, books, chapters, and verses
- Get formatted passages with HTML or text output
- Access Verse of the Day content
- Navigate between chapters and verses

### Language Support
- Get available languages and their metadata
- Filter versions by language ranges
- Support for multiple language scripts

### Context Management
- BibleSDKProvider for API configuration
- ReaderProvider for Bible reading workflows
- VerseSelectionProvider for verse selection features

## Context Providers

### BibleSDKProvider

Required provider that configures the YouVersion Platform SDK with your App Key.

```tsx
import { BibleSDKProvider } from '@youversion/platform-react-hooks';

function App({ children }) {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      {children}
    </BibleSDKProvider>
  );
}
```

### ReaderProvider

Optional provider for managing Bible reading state (current book, chapter, verse).

```tsx
import { ReaderProvider } from '@youversion/platform-react-hooks';

function BibleReader({ currentVersion, currentBook, currentChapter, currentVerse, children }) {
  return (
    <ReaderProvider
      currentVersion={currentVersion}
      currentBook={currentBook}
      currentChapter={currentChapter}
      currentVerse={currentVerse}
    >
      {children}
    </ReaderProvider>
  );
}
```

### VerseSelectionProvider

Optional provider for managing verse selection state.

```tsx
import { VerseSelectionProvider } from '@youversion/platform-react-hooks';

function VerseSelector({ children }) {
  return (
    <VerseSelectionProvider>
      {children}
    </VerseSelectionProvider>
  );
}
```

## API Reference

### Core Hooks

#### useBibleClient

Returns a configured `BibleClient` instance from the core SDK.

```tsx
import { useBibleClient } from '@youversion/platform-react-hooks';

function MyComponent() {
  const bibleClient = useBibleClient();
  // Use bibleClient for direct API calls
}
```

**Throws:** Error if used outside of `BibleSDKProvider` or if `appKey` is not provided.

#### useApiData

Base hook for handling API data fetching with loading and error states.

```tsx
import { useApiData } from '@youversion/platform-react-hooks';

function MyComponent() {
  const { data, loading, error, refetch } = useApiData(
    () => fetch('https://api.example.com/data'),
    [], // dependency array
    { enabled: true } // options
  );
}
```

**Parameters:**
- `fetchFn`: Function that returns a Promise with the data
- `deps`: Dependency array for refetching
- `options`: Configuration options including `enabled`

**Returns:** Object with `data`, `loading`, `error`, and `refetch` properties.

#### useInitData

Hook for initializing application data on startup.

```tsx
import { useInitData } from '@youversion/platform-react-hooks';

function AppInitializer() {
  const { data, loading, error } = useInitData();
  // Handle initialization logic
}
```

#### useAuthentication

Manages user authentication with the YouVersion Platform, including sign-in, sign-out, and user info retrieval.

```tsx
import { useAuthentication } from '@youversion/platform-react-hooks';
import { SignInWithYouVersionPermission } from '@youversion/platform-core';

function AuthComponent() {
  const { auth, signIn, signOut, fetchUserInfo } = useAuthentication();

  const handleSignIn = async () => {
    const result = await signIn(
      [SignInWithYouVersionPermission.bibles], // required permissions
      [SignInWithYouVersionPermission.votd] // optional permissions
    );
    console.log(result);
  };

  const handleGetUserInfo = async () => {
    const userInfo = await fetchUserInfo();
    console.log(userInfo);
  };

  return (
    <div>
      <p>Authenticated: {auth.isAuthenticated ? 'Yes' : 'No'}</p>
      <p>Loading: {auth.isLoading ? 'Yes' : 'No'}</p>
      {auth.error && <p>Error: {auth.error.message}</p>}
      
      {!auth.isAuthenticated ? (
        <button onClick={handleSignIn}>Sign In</button>
      ) : (
        <>
          <button onClick={handleGetUserInfo}>Get User Info</button>
          <button onClick={signOut}>Sign Out</button>
        </>
      )}
    </div>
  );
}
```

**Returns:**
- `auth`: AuthenticationState object containing:
  - `isAuthenticated`: boolean - Whether user is currently authenticated
  - `isLoading`: boolean - Whether authentication operations are in progress
  - `accessToken`: string | null - Current access token if authenticated
  - `result`: SignInWithYouVersionResult | null - Sign-in result details
  - `error`: Error | null - Any authentication error that occurred
- `signIn`: Function to initiate sign-in with optional permission scopes
  - **Parameters:**
    - `requiredPermissions?`: Permission strings required for sign-in
    - `optionalPermissions?`: Permission strings requested but not required
  - **Returns:** Promise<SignInWithYouVersionResult>
- `signOut`: Function to log out the current user
- `fetchUserInfo`: Async function to retrieve current user information
  - **Returns:** Promise<YouVersionUserInfo>

**Throws:** Error if used outside of a provider that supplies authentication context.

### Bible Content Hooks

#### Version Hooks

##### useVersion

Fetches a specific Bible version by ID.

```tsx
import { useVersion } from '@youversion/platform-react-hooks';

function VersionInfo({ versionId }) {
  const { version, loading, error } = useVersion(versionId);
  
  if (loading) return <div>Loading version...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>{version?.title}</h2>
      <p>{version?.abbreviation}</p>
      <p>Language: {version?.language_tag}</p>
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The ID of the Bible version
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `version`, `loading`, `error`, and `refetch` properties.

##### useVersions

Fetches a collection of Bible versions filtered by language.

```tsx
import { useVersions } from '@youversion/platform-react-hooks';

function EnglishVersions() {
  const { versions, loading, error } = useVersions('en');
  
  return (
    <div>
      <h2>English Bible Versions</h2>
      {versions?.data.map((version) => (
        <div key={version.id}>
          <h3>{version.title}</h3>
          <p>{version.abbreviation}</p>
        </div>
      ))}
    </div>
  );
}
```

**Parameters:**
- `languageRanges`: string - Language filter (e.g., 'en', 'es*')
- `licenseId?`: string | number - Optional license filter
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `versions`, `loading`, `error`, and `refetch` properties.

##### useFilteredVersions

Fetches versions with advanced filtering options.

```tsx
import { useFilteredVersions } from '@youversion/platform-react-hooks';

function FilteredVersions() {
  const { versions, loading, error } = useFilteredVersions({
    language: 'en',
    licenseId: 'your-license-id'
  });
  
  // Render filtered versions
}
```

**Parameters:**
- `filters`: FilterOptions - Filtering configuration
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `versions`, `loading`, `error`, and `refetch` properties.

#### Book Hooks

##### useBook

Fetches a specific book from a Bible version.

```tsx
import { useBook } from '@youversion/platform-react-hooks';

function BookInfo({ versionId, bookCode }) {
  const { book, loading, error } = useBook(versionId, bookCode);
  
  return (
    <div>
      <h2>{book?.title}</h2>
      <p>Chapters: {book?.chapters?.length}</p>
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID
- `bookCode`: string - Book code (e.g., 'GEN', 'JHN')
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `book`, `loading`, `error`, and `refetch` properties.

##### useBooks

Fetches all books from a Bible version.

```tsx
import { useBooks } from '@youversion/platform-react-hooks';

function BookList({ versionId }) {
  const { books, loading, error } = useBooks(versionId);
  
  return (
    <div>
      <h2>Books of the Bible</h2>
      {books?.data.map((book) => (
        <div key={book.id}>
          <h3>{book.title}</h3>
          <p>{book.abbreviation}</p>
        </div>
      ))}
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID
- `canon?`: 'ot' | 'nt' | 'deuterocanon' - Optional canon filter
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `books`, `loading`, `error`, and `refetch` properties.

#### Chapter Hooks

##### useChapter

Fetches a specific chapter from a Bible version and book.

```tsx
import { useChapter } from '@youversion/platform-react-hooks';

function ChapterContent({ versionId, bookCode, chapterNumber }) {
  const { chapter, loading, error } = useChapter(versionId, bookCode, chapterNumber);
  
  return (
    <div>
      <h2>{chapter?.reference}</h2>
      <p>Number of verses: {chapter?.verses?.length}</p>
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID
- `bookCode`: string - Book code (e.g., 'GEN', 'JHN')
- `chapterNumber`: number - Chapter number
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `chapter`, `loading`, `error`, and `refetch` properties.

##### useChapters

Fetches all chapters from a specific book in a Bible version.

```tsx
import { useChapters } from '@youversion/platform-react-hooks';

function ChapterList({ versionId, bookCode }) {
  const { chapters, loading, error } = useChapters(versionId, bookCode);
  
  return (
    <div>
      <h2>Chapters</h2>
      {chapters?.data.map((chapter) => (
        <div key={chapter.id}>
          <h3>Chapter {chapter.number}</h3>
          <p>Reference: {chapter.reference}</p>
        </div>
      ))}
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID
- `bookCode`: string - Book code (e.g., 'GEN', 'JHN')
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `chapters`, `loading`, `error`, and `refetch` properties.

##### useChapterNavigation

Provides navigation functionality for Bible chapters.

```tsx
import { useChapterNavigation } from '@youversion/platform-react-hooks';

function ChapterNavigator({ versionId, bookCode, currentChapter }) {
  const { nextChapter, previousChapter, canGoNext, canGoPrevious } = useChapterNavigation(
    versionId, 
    bookCode, 
    currentChapter
  );
  
  return (
    <div>
      <button disabled={!canGoPrevious} onClick={() => previousChapter()}>
        Previous
      </button>
      <button disabled={!canGoNext} onClick={() => nextChapter()}>
        Next
      </button>
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID
- `bookCode`: string - Book code (e.g., 'GEN', 'JHN')
- `currentChapter`: number - Current chapter number
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with navigation methods and state properties.

#### Verse Hooks

##### useVerse

Fetches a specific verse from a Bible version.

```tsx
import { useVerse } from '@youversion/platform-react-hooks';

function VerseDisplay({ versionId, bookCode, chapterNumber, verseNumber }) {
  const { verse, loading, error } = useVerse(versionId, bookCode, chapterNumber, verseNumber);
  
  return (
    <div>
      <h3>{verse?.reference}</h3>
      <p>{verse?.text}</p>
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID
- `bookCode`: string - Book code (e.g., 'GEN', 'JHN')
- `chapterNumber`: number - Chapter number
- `verseNumber`: number - Verse number
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `verse`, `loading`, `error`, and `refetch` properties.

##### useVerses

Fetches all verses from a specific chapter.

```tsx
import { useVerses } from '@youversion/platform-react-hooks';

function ChapterVerses({ versionId, bookCode, chapterNumber }) {
  const { verses, loading, error } = useVerses(versionId, bookCode, chapterNumber);
  
  return (
    <div>
      {verses?.data.map((verse) => (
        <p key={verse.id}>
          <strong>{verse.reference}</strong> {verse.text}
        </p>
      ))}
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID
- `bookCode`: string - Book code (e.g., 'GEN', 'JHN')
- `chapterNumber`: number - Chapter number
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `verses`, `loading`, `error`, and `refetch` properties.

#### Passage Hook

##### usePassage

Fetches a Bible passage in USFM format with optional formatting.

```tsx
import { usePassage } from '@youversion/platform-react-hooks';

function BiblePassage({ versionId, usfm }) {
  const { passage, loading, error } = usePassage(versionId, usfm, 'html', true, false);
  
  return (
    <div>
      <h2>{passage?.human_reference}</h2>
      <div dangerouslySetInnerHTML={{ __html: passage?.content || '' }} />
    </div>
  );
}
```

**Parameters:**
- `versionId`: number - The Bible version ID ([YouVersion API Docs](https://developers.youversion.com/api))
- `usfm`: string - USFM reference (e.g., 'JHN.3.16', 'GEN.1.1-2.3') ([YouVersion API Docs](https://developers.youversion.com/api))
- `format?`: 'html' | 'text' - Output format (default: 'html')
- `includeHeadings?`: boolean - Include section headings (default: false)
- `includeNotes?`: boolean - Include study notes (default: false)
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `passage`, `loading`, `error`, and `refetch` properties.

#### Verse of the Day Hook

##### useVerseOfTheDay

Fetches the Verse of the Day for a specific day.

```tsx
import { useVerseOfTheDay } from '@youversion/platform-react-hooks';

function DailyVerse() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const { data: votd, loading, error } = useVerseOfTheDay(dayOfYear);
  
  if (loading) return <div>Loading today's verse...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>Verse of the Day</h2>
      <p>Day {votd?.day}: {votd?.passage_id}</p>
    </div>
  );
}
```

**Parameters:**
- `day`: number - Day of the year (1-366)
- `options?`: UseApiDataOptions - Optional configuration

**Returns:** Object with `data`, `loading`, `error`, and `refetch` properties.

### Language Hooks

##### useLanguages

Fetches available languages with optional filtering.

```tsx
import { useLanguages } from '@youversion/platform-react-hooks';

function LanguageList() {
  const { languages, loading, error } = useLanguages({
    country: 'US'
  });
  
  return (
    <div>
      <h2>Available Languages</h2>
      {languages?.data.map((language) => (
        <div key={language.id}>
          <h3>{language.display_names.en}</h3>
          <p>Code: {language.language}</p>
        </div>
      ))}
    </div>
  );
}
```

**Parameters:**
- `options?`: GetLanguagesOptions - Language filtering options
- `hookOptions?`: UseApiDataOptions - Hook configuration options

**Returns:** Object with `languages`, `loading`, `error`, and `refetch` properties.

### Context Providers

#### BibleSDKProvider

Required provider that configures the YouVersion Platform SDK.

```tsx
import { BibleSDKProvider } from '@youversion/platform-react-hooks';

interface BibleSDKProviderProps {
  children: React.ReactNode;
  appKey: string; // Your YouVersion Platform App Key
}

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      {/* Your app components */}
    </BibleSDKProvider>
  );
}
```

**Props:**
- `appKey`: string - Your YouVersion Platform App Key (required)

#### ReaderProvider

Provider for managing Bible reading state.

```tsx
import { ReaderProvider } from '@youversion/platform-react-hooks';
import type { BibleVersion, BibleBook, BibleChapter, BibleVerse } from '@youversion/platform-core';

interface ReaderProviderProps {
  children: React.ReactNode;
  currentVersion: BibleVersion;
  currentBook: BibleBook;
  currentChapter: BibleChapter;
  currentVerse: BibleVerse | null;
}

function BibleReader({ children, ...initialState }) {
  return (
    <ReaderProvider {...initialState}>
      {children}
    </ReaderProvider>
  );
}
```

**Props:**
- `children`: React.ReactNode - Child components
- `currentVersion`: BibleVersion - Current Bible version
- `currentBook`: BibleBook - Current book
- `currentChapter`: BibleChapter - Current chapter
- `currentVerse`: BibleVerse | null - Current verse (optional)

#### VerseSelectionProvider

Provider for managing verse selection state.

```tsx
import { VerseSelectionProvider, useVerseSelection } from '@youversion/platform-react-hooks';

function VerseSelector({ children }) {
  return (
    <VerseSelectionProvider>
      {children}
    </VerseSelectionProvider>
  );
}

function VerseSelectorComponent() {
  const { 
    selectedVerseUsfms, 
    toggleVerse, 
    isSelected, 
    clearSelection, 
    selectedCount 
  } = useVerseSelection();
  
  return (
    <div>
      <p>Selected: {selectedCount} verses</p>
      <button onClick={clearSelection}>Clear Selection</button>
    </div>
  );
}
```

**Props:**
- `children`: React.ReactNode - Child components

**Context Value:**
- `selectedVerseUsfms`: Set<string> - Selected verse USFM references
- `toggleVerse`: (usfm: string) => void - Toggle verse selection
- `isSelected`: (usfm: string) => boolean - Check if verse is selected
- `clearSelection`: () => void - Clear all selections
- `selectedCount`: number - Number of selected verses

## Troubleshooting

### Provider Not Found Error

**Error:** `Error: useBibleClient must be used within a BibleSDKProvider`

**Solution:** Ensure `BibleSDKProvider` wraps your component tree:

```tsx
// ❌ Wrong - hook used outside provider
function MyComponent() {
  const { client } = useBibleClient(); // ERROR!
}

// ✅ Correct - hook used inside provider
function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <MyComponent />
    </BibleSDKProvider>
  );
}
```

### Invalid App Key Error

**Error:** `Error: Invalid appKey provided`

**Solution:** Verify your App Key:
- Get your App Key from https://platform.youversion.com/
- Ensure it's passed correctly: `<BibleSDKProvider appKey="your_actual_id">`
- Check for typos or extra whitespace
- Verify the app is active (not archived)

### Hook Validation Error

**Error:** `Error: Invalid parameters passed to hook`

**Solution:** Check hook arguments:
- Version IDs must be numbers (e.g., `useVersion(111)`)
- Passage references must be valid USFM (e.g., `usePassage(111, 'JHN.3.16')`)
- Verify you're using enabled hooks correctly with the `enabled` option:

```tsx
const { passage, loading, error } = usePassage(111, 'JHN.3.16', {
  enabled: true // Disable with false to prevent fetching
});
```

## Development

### Testing

The hooks package uses Vitest for testing. Tests are located alongside the source files.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

### Building

```bash
# Build the package
pnpm run build

# Watch for changes during development
pnpm run dev
```

### Type Checking

```bash
# Check TypeScript types
pnpm run check-types
```

### Linting

```bash
# Run ESLint
pnpm run lint
```

## License

See [LICENSE](../../LICENSE)

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/youversion/platform-sdk-react/issues)
- Documentation: [YouVersion Platform Docs](https://platform.youversion.com/)
- Core SDK: [See @youversion/platform-core documentation](../../packages/core/README.md)
- Monorepo: [YouVersion Platform SDK Monorepo](../../README.md) for the full SDK overview and all packages
