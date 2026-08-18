![License](https://img.shields.io/badge/license-Apache%202.0-blue)

# @youversion/platform-react-hooks

React hooks for accessing YouVersion Platform APIs with automatic loading/error states.

## When to use this package

Use `@youversion/platform-react-hooks` when you need to:
- ✅ Build custom React components with Bible features
- ✅ Fetch data declaratively with automatic loading/error states
- ✅ Keep control over component UI while leveraging reusable hooks
- ✅ Support server-side rendering compatible hooks

**Use other packages instead if you:**
- ❌ Need direct API access → Use [@youversion/platform-core](../core/README.md) for low-level client
- ❌ Want ready-made UI → Use [@youversion/platform-react-ui](../ui/README.md) for production components

## Install

```bash
pnpm add @youversion/platform-react-hooks
```

Get your App Key at [platform.youversion.com](https://platform.youversion.com/)

## Usage

```tsx
import { YouVersionProvider, usePassage } from '@youversion/platform-react-hooks';

// `permittedVersionIds`, `excludedVersionIds`, and `permittedLanguageTags`
// on the provider limit which Bible versions hooks will load.

function BibleVerse() {
  const { passage, loading } = usePassage({ versionId: 3034, usfm: 'JHN.3.16' });
  if (loading) return <div>Loading...</div>;
  return <div dangerouslySetInnerHTML={{ __html: passage?.content || '' }} />;
}

function App() {
  return (
    <YouVersionProvider
      appKey="YOUR_APP_KEY"
      permittedVersionIds={[111, 3034]}
      excludedVersionIds={[4212]}
      permittedLanguageTags={['en']}
    >
      <BibleVerse />
    </YouVersionProvider>
  );
}
```

## Documentation and API Reference
* [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## License

This SDK is licensed under [Apache 2.0](./LICENSE). 

Licensing information for the Bible versions is available 
at the [YouVersion Platform](https://platform.youversion.com/) site.
