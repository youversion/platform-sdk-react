![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)
![React >= 19.0.0](https://img.shields.io/badge/React-%3E%3D%2019.0.0-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

# @youversion/platform-react-hooks

A comprehensive collection of React hooks for accessing the YouVersion Platform APIs. Build Bible-based applications with type-safe hooks that handle loading states, error handling, and data fetching automatically.

## Overview

`@youversion/platform-react-hooks` provides React hooks that wrap the [@youversion/platform-core](../core/README.md) SDK, offering a declarative way to access Bible data in your React applications. Features automatic loading and error state management, type-safe hooks with TypeScript support, and memoized data fetching.

> **📚 Full Documentation:** [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## Installation

```bash
pnpm add @youversion/platform-react-hooks
```

### Peer Dependencies

Requires React 19.0.0 or higher:

```bash
pnpm install react@19.0.0
```

## When to Use This Package

Use `@youversion/platform-react-hooks` when you need:
- ✅ Building custom React components with Bible features
- ✅ Declarative data fetching with automatic loading/error states
- ✅ Control over component UI while using reusable hooks
- ✅ Server-side rendering compatible hooks

**Use other packages instead if:**
- ❌ Need direct API access → Use [@youversion/platform-core](../core/README.md) for low-level client
- ❌ Want ready-made UI → Use [@youversion/platform-react-ui](../ui/README.md) for production components

## Related Packages

- **[@youversion/platform-core](../core/README.md)** - Core TypeScript SDK for direct API access
- **[@youversion/platform-react-ui](../ui/README.md)** - Pre-built React components

## Setup

All hooks require the `BibleSDKProvider` to be wrapped around your application:

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

> **⚠️ Missing Provider Error:** If you use a hook without wrapping it in `BibleSDKProvider`, you'll get: `Error: useBibleClient must be used within a BibleSDKProvider`.

## Quick Start

```tsx
import { BibleSDKProvider, useVersion, usePassage } from '@youversion/platform-react-hooks';

function BibleVerse() {
  const { version, loading: versionLoading } = useVersion(111);
  const { passage, loading: passageLoading } = usePassage(111, 'JHN.3.16');

  if (versionLoading || passageLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{passage?.human_reference}</h1>
      <p>Version: {version?.abbreviation}</p>
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
```

## Features

- Fetch Bible versions, books, chapters, and verses
- Get formatted passages with HTML or text output
- Access Verse of the Day content
- Navigate between chapters and verses
- Query available languages and metadata
- Automatic loading/error state management

## Troubleshooting

### Provider Not Found Error

**Error:** `Error: useBibleClient must be used within a BibleSDKProvider`

**Solution:** Ensure `BibleSDKProvider` wraps your component tree:

```tsx
// ✅ Correct
function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <MyComponent />
    </BibleSDKProvider>
  );
}
```

### Invalid App Key Error

**Solution:** Get your App Key from [platform.youversion.com](https://platform.youversion.com/) and verify it's passed correctly.

## Development

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development instructions.

## License

See [LICENSE](../../LICENSE)

## Support

- GitHub Issues: [Create an issue](https://github.com/youversion/platform-sdk-react/issues)
- Platform Docs: [platform.youversion.com](https://platform.youversion.com/)
- Core SDK: [@youversion/platform-core documentation](../core/README.md)
- Monorepo: [YouVersion Platform SDK](../../README.md)
