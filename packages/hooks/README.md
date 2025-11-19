![License](https://img.shields.io/badge/license-Apache%202.0-blue)

# @youversion/platform-react-hooks

React hooks for accessing YouVersion Platform APIs with automatic loading/error states.

## When to use this package

Use `@youversion/platform-react-hooks` when you need:
- ✅ Building custom React components with Bible features
- ✅ Declarative data fetching with automatic loading/error states
- ✅ Control over component UI while using reusable hooks
- ✅ Server-side rendering compatible hooks

**Use other packages instead if:**
- ❌ Need direct API access → Use [@youversion/platform-core](../core/README.md) for low-level client
- ❌ Want ready-made UI → Use [@youversion/platform-react-ui](../ui/README.md) for production components

## Install

```bash
pnpm add @youversion/platform-react-hooks
```

Get your App Key at [platform.youversion.com](https://platform.youversion.com/)

## Usage

Wrap your app with `BibleSDKProvider`:

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

---

**API Reference:** [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)
