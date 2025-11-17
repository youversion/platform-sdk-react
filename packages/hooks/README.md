![License](https://img.shields.io/badge/license-Apache%202.0-blue)

# @youversion/platform-react-hooks

React hooks for accessing YouVersion Platform APIs with automatic loading/error states.

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
