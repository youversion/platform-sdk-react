![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)
![React >= 19.0.0](https://img.shields.io/badge/React-%3E%3D%2019.0.0-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## Table of Contents

- [@youversion/platform-react-ui](#youversionplatform-react-ui)
  - [Overview](#overview)
  - [Installation](#installation)
  - [When to Use This Package](#when-to-use-this-package)
  - [Related Packages](#related-packages)
  - [Setup: Provider Configuration](#setup-provider-configuration)
  - [Quick Start](#quick-start)
  - [Common Patterns](#common-patterns)
  - [Features and Capabilities](#features-and-capabilities)
  - [Theming](#theming)
  - [Components Reference](#components-reference)
  - [Hooks](#hooks)
  - [Development](#development)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)
  - [Support](#support)

# @youversion/platform-react-ui

Pre-built React components for building Bible-based applications with the YouVersion Platform SDK. Get styled, production-ready components that work seamlessly with authentication, Bible reading, and YouVersion APIs.

## Overview

`@youversion/platform-react-ui` provides a collection of ready-to-use React components for Bible-focused applications. Instead of building UI components from scratch, this package offers styled components that handle authentication, Bible content display, and version/chapter selection out of the box.

This package depends on [`@youversion/platform-react-hooks`](../../packages/hooks/README.md) and [`@youversion/platform-core`](../../packages/core/README.md), and re-exports components and hooks to simplify your imports.

### When to use each package

- **Core package**: You need direct API access, server-side usage, or full control over data fetching
- **React hooks package**: You're building custom React components and want hooks for Bible data access
- **React UI package** (this one): You want production-ready UI components with styling already applied

### Key Benefits

- Pre-styled components with theming support
- Light and dark mode out of the box
- Full TypeScript support with type safety
- Scoped CSS to prevent conflicts with your app
- Re-exports of commonly used hooks for convenience
- Accessibility-first component design

## Installation

Install the package from npm:

```bash
npm install @youversion/platform-react-ui
```

Or with pnpm:

```bash
pnpm add @youversion/platform-react-ui
```

Or with yarn:

```bash
yarn add @youversion/platform-react-ui
```

### Peer Dependencies

This package requires React 19.0.0 or higher:

```bash
pnpm install react@19.0.0
```

### Prerequisites

- YouVersion Platform App Key (Get from [https://platform.youversion.com/](https://platform.youversion.com/))

## When to Use This Package

Use `@youversion/platform-react-ui` when you need:
- ✅ Production-ready Bible components for your React app
- ✅ Pre-styled components with light/dark mode
- ✅ Minimal setup—wrap your app with providers and use components
- ✅ Consistent, accessible UI out of the box
- ✅ Authentication, verse display, and Bible reading experiences

**Use other packages instead if:**
- ❌ Need low-level API access → Use `@youversion/platform-core` for direct client
- ❌ Want custom UI → Use `@youversion/platform-react-hooks` to build custom components

## Related Packages

This package builds on two other core packages in the SDK:

- **[@youversion/platform-core](../../packages/core/README.md)** - Low-level TypeScript SDK for direct API access to Bible data and authentication
- **[@youversion/platform-react-hooks](../../packages/hooks/README.md)** - React hooks wrapping the core SDK for declarative data fetching with loading and error states

For complete parameter and configuration documentation, see the [Core SDK API Reference](../../packages/core/README.md#configuration).

## Setup: Provider Configuration

This package requires two providers to function:

### 1. BibleSDKProvider (Required)

Initializes the API client that all components depend on:

```tsx
<BibleSDKProvider appKey="YOUR_APP_KEY">
  {/* Components work here */}
</BibleSDKProvider>
```

### 2. YVPProvider (Required)

Manages authentication and YouVersion Platform features:

```tsx
<YVPProvider config={{ appKey: import.meta.env.YVP_APP_KEY }}>
  {/* Authenticated components work here */}
</YVPProvider>
```

### Complete Setup Example

```tsx
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: import.meta.env.YVP_APP_KEY }}>
        {/* All components work here */}
        <YourApp />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

> **⚠️ Missing Provider Error:** If components don't render correctly, check that both `BibleSDKProvider` and `YVPProvider` wrap your component tree. Errors will indicate which provider is missing.

## Quick Start

### Complete Setup Example: Next.js App Router

**1. Import styles in `app/layout.tsx`:**

```tsx
import '@youversion/platform-react-ui/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**2. Add providers in your root layout or app component:**

```tsx
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <BibleSDKProvider appKey={import.meta.env.YVP_APP_KEY}>
          <YVPProvider config={{ appKey: import.meta.env.YVP_APP_KEY }}>
            {children}
          </YVPProvider>
        </BibleSDKProvider>
      </body>
    </html>
  );
}
```

**3. Use components in your pages:**

```tsx
import { SignInButton, VerseOfTheDay } from '@youversion/platform-react-ui';

export default function Home() {
  return (
    <div>
      <h1>Welcome to Bible App</h1>
      <SignInButton />
      <VerseOfTheDay />
    </div>
  );
}
```

### Complete Setup Example: Vite/SPA

**1. Import styles in `main.tsx`:**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BibleSDKProvider appKey={import.meta.env.VITE_APP_KEY}>
      <YVPProvider config={{ appKey: import.meta.env.VITE_APP_KEY }}>
        <App />
      </YVPProvider>
    </BibleSDKProvider>
  </React.StrictMode>
);
```

**2. Use components in your app:**

```tsx
import { SignInButton, VerseOfTheDay } from '@youversion/platform-react-ui';

function App() {
  return (
    <div>
      <h1>Welcome to Bible App</h1>
      <SignInButton />
      <VerseOfTheDay />
    </div>
  );
}

export default App;
```

## Features and Capabilities

### Pre-Built Components
- Ready-to-use UI components for authentication, Bible reading, and content display
- Styled out of the box with professional design
- No additional styling configuration required

### Full Theming Support
- Light and dark mode toggling at runtime
- CSS variable overrides for customization
- Scoped CSS to prevent conflicts with host applications

### Bible Content Display
- Display Bible verses and passages with proper formatting
- Bible version and chapter selection components
- Verse of the Day component with automatic daily updates

### Authentication
- SignInButton for OAuth flow with YouVersion
- Authentication state management built-in
- User profile and permission handling

### Type Safety
- Full TypeScript support with exported types
- Type-safe component props with proper IntelliSense
- No implicit any types

### Accessibility
- Standard HTML semantics
- ARIA attributes for interactive elements
- Keyboard navigation support

## Theming

The React SDK's theme is fully scoped to avoid conflicts with your app. Colors, fonts, and layout are customizable via CSS variables.

### Basic Usage

Set the theme via the `YVPProvider`:

```tsx
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';

export default function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider
        config={{ appKey: import.meta.env.YVP_APP_KEY }}
        theme="dark"  // 'light' | 'dark' (default: 'light')
      >
        <YourApp />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

### Toggle Theme at Runtime

```tsx
import { useState } from 'react';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider
        config={{ appKey: import.meta.env.YVP_APP_KEY }}
        theme={theme}
      >
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Toggle theme
        </button>
        <YourApp />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

### Customizing Styles

The SDK uses scoped CSS variables prefixed with `--yv-` to avoid conflicts. Override them after importing the SDK's styles:

```css
[data-yv-sdk] {
  /* Override theme colors */
  --yv-primary: #your-primary-color;
  --yv-background: #your-background-color;
  --yv-foreground: #your-text-color;

  /* Override Bible reader styles */
  --yv-reader-font-size: 18px;
  --yv-reader-line-height: 1.5;
  --yv-reader-font-family: 'Your Font', serif;
}
```

## Components Reference

### SignInButton

A button that initiates the OAuth sign-in flow with YouVersion. Handles authentication state and user management.

```tsx
import { SignInButton } from '@youversion/platform-react-ui';

export default function AuthPage() {
  return (
    <div className="flex flex-col items-center gap-4">
      <SignInButton />
    </div>
  );
}
```

**Related Hook:** [`useAuthentication`](#useauthentication)

### BibleTextView

Component for rendering Bible verses or passages from the YouVersion API. Automatically fetches and displays formatted Bible content. Requires the app to be wrapped with `BibleSDKProvider`.

```tsx
import { BibleTextView } from '@youversion/platform-react-ui';

export default function Page() {
  return (
    <BibleTextView
      reference="JHN.3.16"
      versionId={1}
      fontFamily="serif"
      fontSize={20}
      lineHeight={1.5}
    />
  );
}
```

**Props:**
- `reference`: Bible reference in USFM format (e.g., `"JHN.3.16"` for John 3:16, `"GEN.1.1-5"` for a range) (required) - [YouVersion API Docs](https://developers.youversion.com/api)
- `versionId`: Bible version ID (e.g., 1 for KJV) (required)
- `fontFamily`: Optional font family for the text
- `fontSize`: Optional font size in pixels
- `lineHeight`: Optional line height

**Related Hook:** [`usePassage`](../../packages/hooks/README.md#usepassage)

### BibleChapterPicker

Component for navigating and selecting chapters within a Bible book. Provides a popover-based interface for selecting books and chapters.

```tsx
import { BibleChapterPicker } from '@youversion/platform-react-ui';

export default function Page() {
  return (
    <BibleChapterPicker.Root 
      versionId={1} 
      defaultBook="JHN" 
      onBookChange={(book) => console.log(book)}
      onChapterChange={(chapter) => console.log(chapter)}
    >
      <BibleChapterPicker.Trigger>
        Select Chapter
      </BibleChapterPicker.Trigger>
    </BibleChapterPicker.Root>
  );
}
```

**Related Hooks:** [`useBooks`](../../packages/hooks/README.md#usebooks), [`useChapters`](../../packages/hooks/README.md#usechapters)

### VerseOfTheDay

Component that displays the Verse of the Day with automatic daily updates.

```tsx
import { VerseOfTheDay } from '@youversion/platform-react-ui';

export default function Page() {
  return <VerseOfTheDay versionId={1} />;
}
```

**Related Hook:** [`useVerseOfTheDay`](../../packages/hooks/README.md#useverseof-the-day)

## Hooks

This package re-exports hooks from `@youversion/platform-react-hooks` for convenience. These hooks provide declarative data fetching with automatic loading and error state management.

See [@youversion/platform-react-hooks documentation](../../packages/hooks/README.md#api-reference) for complete reference and examples.

### Providers

#### BibleSDKProvider

Required provider that configures the YouVersion Platform SDK. Pass your App Key here.

```tsx
import { BibleSDKProvider } from '@youversion/platform-react-ui';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      {/* Your components */}
    </BibleSDKProvider>
  );
}
```

**Props:**
- `appKey`: Your YouVersion Platform App Key (required)

#### YVPProvider

Configures authentication and theming for the UI components.

```tsx
import { YVPProvider } from '@youversion/platform-react-ui';

function App() {
  return (
    <YVPProvider 
      config={{ appKey: import.meta.env.YVP_APP_KEY }} 
      theme="light"
    >
      {/* Your components */}
    </YVPProvider>
  );
}
```

**Props:**
- `config`: Configuration object with `appKey` (required)
- `theme`: Theme mode (`'light'` | `'dark'`, default: `'light'`)

## Development

### Project Structure

```
packages/ui/
├── .storybook/          # Storybook configuration
├── src/
│   ├── components/      # React UI components
│   ├── hooks/           # Custom hooks
│   ├── providers/       # React context providers
│   ├── styles/          # Global CSS and theme variables
│   ├── lib/             # Utility functions
│   ├── types.ts         # Exported types
│   └── index.ts
├── package.json
└── tsconfig.json
```

### Development Commands

```bash
# From monorepo root
pnpm install

# Build all the packages
pnpm build

# Start development with watch mode
pnpm dev

# Run tests
pnpm --filter @youversion/platform-react-ui test

# Run tests in watch mode
pnpm --filter @youversion/platform-react-ui test:watch

# Run tests with coverage
pnpm --filter @youversion/platform-react-ui test:coverage

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

### Storybook Development

Storybook is configured for component development and visual testing.

**Environment Setup:**

Create a `.env.local` file in `packages/ui/` with:

```bash
# Required for Storybook components that interact with YouVersion API
STORYBOOK_YOUVERSION_APP_KEY="your-app-id"
```

**Start Storybook:**
```bash
pnpm storybook
```

**Build Storybook:**
```bash
pnpm build-storybook
```

### Testing

The UI package uses Vitest for unit testing. Tests are located alongside source files.

```bash
# Run all tests
pnpm --filter @youversion/platform-react-ui test

# Run tests in watch mode
pnpm --filter @youversion/platform-react-ui test:watch

# Run tests with coverage
pnpm --filter @youversion/platform-react-ui test:coverage
```

## Common Patterns

### Pattern 1: Display Bible Verse with Version Picker

```tsx
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import { BibleVersionPicker, BibleVerseText } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

function VerseDisplay() {
  const [versionId, setVersionId] = React.useState(111); // NIV

  return (
    <div>
      <BibleVersionPicker selected={versionId} onSelect={setVersionId} />
      <BibleVerseText versionId={versionId} usfm="JHN.3.16" />
    </div>
  );
}

export default function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: import.meta.env.YVP_APP_KEY }}>
        <VerseDisplay />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

### Pattern 2: Build a Simple Bible Reader

```tsx
import React from 'react';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import { BibleChapterPicker, BibleChapterText } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

function BibleReader() {
  const [versionId, setVersionId] = React.useState(111);
  const [bookId, setBookId] = React.useState('JHN');
  const [chapterId, setChapterId] = React.useState(3);

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select value={versionId} onChange={(e) => setVersionId(Number(e.target.value))}>
          <option value={111}>NIV</option>
          <option value={206}>NLT</option>
          <option value={113}>NKJV</option>
        </select>
        <BibleChapterPicker
          versionId={versionId}
          selected={{ bookId, chapterId }}
          onSelect={({ bookId: b, chapterId: c }) => {
            setBookId(b);
            setChapterId(c);
          }}
        />
      </div>
      <BibleChapterText versionId={versionId} bookId={bookId} chapterId={chapterId} />
    </div>
  );
}

export default function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: import.meta.env.YVP_APP_KEY }}>
        <BibleReader />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

### Pattern 3: Search and Display Results

```tsx
import React from 'react';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import { useSearch } from '@youversion/platform-react-hooks';
import '@youversion/platform-react-ui/styles.css';

function SearchResults() {
  const [query, setQuery] = React.useState('love');
  const [versionId, setVersionId] = React.useState(111);
  const { results, loading, error } = useSearch(query, versionId);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the Bible..."
      />
      
      {loading && <p>Searching...</p>}
      {error && <p>Error: {error.message}</p>}
      
      <div>
        {results?.data?.map((result) => (
          <div key={result.usfm}>
            <strong>{result.reference}</strong>
            <p>{result.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: import.meta.env.YVP_APP_KEY }}>
        <SearchResults />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

## Troubleshooting

### Styles Not Applied

**Problem:** Components appear unstyled.

**Solution:** Ensure you imported `@youversion/platform-react-ui/styles.css` at your app's root entry point (e.g., `app/layout.tsx` for Next.js). Do not import the CSS from component files.

### Next.js Error: "Global CSS cannot be imported from within node_modules"

**Problem:** Next.js rejects CSS imports from node_modules in component files.

**Solution:** Move the import to your root layout file:

```tsx
// app/layout.tsx
import '@youversion/platform-react-ui/styles.css';
```

### Storybook Components Not Working

**Problem:** Components show error or fallback states in Storybook.

**Solution:** Ensure `STORYBOOK_YOUVERSION_APP_KEY` is set in `packages/ui/.env.local`. Components will use fallback demo values if the environment variable is not set.

### Provider Errors

**Problem:** "useAuthentication() called outside of provider" or similar errors.

**Solution:** Wrap your component tree with both required providers at the app root:

```tsx
<BibleSDKProvider appKey="YOUR_APP_KEY">
  <YVPProvider config={{ appKey: import.meta.env.YVP_APP_KEY }}>
    {/* Your components */}
  </YVPProvider>
</BibleSDKProvider>
```

### Common Styling Issues

**Problem:** Styles conflict with your app styles.

**Solution:** The SDK uses scoped CSS variables prefixed with `--yv-` to prevent conflicts. If styles still conflict, check that your app's CSS doesn't override the `[data-yv-sdk]` selector or CSS variables with the same names.

## License

See [LICENSE](../../LICENSE)

## Support

For issues and questions:

- GitHub Issues: [Create an issue](https://github.com/youversion/platform-sdk-react/issues)
- Documentation: [YouVersion Platform Docs](https://platform.youversion.com/)
- React Hooks: [See @youversion/platform-react-hooks documentation](../../packages/hooks/README.md)
- Core SDK: [See @youversion/platform-core documentation](../../packages/core/README.md)
- Monorepo: [YouVersion Platform SDK Monorepo](../../README.md) for the full SDK overview and all packages
