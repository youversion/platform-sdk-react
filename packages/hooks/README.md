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

## Unified search

Inside `YouVersionProvider`, use `useUnifiedSearch` for an unpaginated snapshot
of top verse references, related topics, and image hits. Search requires an app
key authorized for Search.

```tsx
import { useUnifiedSearch } from '@youversion/platform-react-hooks';

function SearchResults({ query }: { query: string }) {
  const { data, loading, error, refetch } = useUnifiedSearch({
    query,
    versionId: 111,
    languageRanges: ['en'],
  });
  if (loading) return <div>Loading...</div>;
  if (error) return <button onClick={refetch}>Retry</button>;
  return <ul>{data?.topics.map((topic) => <li key={topic.text}>{topic.text}</li>)}</ul>;
}
```

The props also accept `userIntent` and `fields` (`verses`, `topics`, and/or
`images`). Omit `fields` for all kinds, or provide a nonempty selection such as
`fields: ['images']`. An empty array is invalid. Image hits contain `id` and
`passageId`, not image URLs. Verse hits contain passage IDs, not passage text.

Image selection requires backend support. A production check on 2026-10-20
returned HTTP 400 for `fields: ['images']`; the SDK supports mapping image hits,
but this does not make image selection available on that deployment.

You control when to submit or debounce the query. This hook does not load
suggestions or paginate. The existing `useBibleSearch` hook keeps its suggestion
and paginated verse-search behavior. Use supported search language codes such as
`en`; the SDK does not add fallback ranges.

## Documentation and API Reference
* [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## License

This SDK is licensed under [Apache 2.0](./LICENSE). 

Licensing information for the Bible versions is available 
at the [YouVersion Platform](https://platform.youversion.com/) site.
