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

function BibleVerse() {
  const { passage, loading } = usePassage({ versionId: 3034, usfm: 'JHN.3.16' });
  if (loading) return <div>Loading...</div>;
  return <div dangerouslySetInnerHTML={{ __html: passage?.content || '' }} />;
}

function App() {
  return (
    <YouVersionProvider appKey="YOUR_APP_KEY">
      <BibleVerse />
    </YouVersionProvider>
  );
}
```

## Version filters

Restrict which Bible versions the SDK offers with three optional `YouVersionProvider` props:

```tsx
<YouVersionProvider
  appKey="YOUR_APP_KEY"
  permittedVersionIds={[111, 3034]}
  excludedVersionIds={[206]}
  permittedLanguageTags={['en', 'es']}
>
  <BibleVerse />
</YouVersionProvider>
```

| Prop | Type | Behavior |
|------|------|----------|
| `permittedVersionIds` | `number[]` | Allowlist of Bible version ids |
| `excludedVersionIds` | `number[]` | Denylist of Bible version ids |
| `permittedLanguageTags` | `string[]` | Allowlist of BCP-47 language tags (`'en'`, `'es'`), matched against each version's language tag |

Semantics match the Swift SDK:

- Exclusion wins. A version in both `permittedVersionIds` and `excludedVersionIds` is excluded.
- The two allowlists are ANDed. A version must pass both to be offered.
- Leaving a prop unset means unrestricted.
- **An empty array permits nothing.** `permittedVersionIds={[]}` offers no versions at all. Build the list before you pass it, or leave the prop off.

Filtering covers lists only: `useVersions` and `useLanguages` return filtered results. Fetching a version by id is never blocked — `usePassage({ versionId: 206 })` works even when 206 is excluded, so deep links and saved reading positions keep working when your filters change. `permittedLanguageTags` is the only filter `useLanguages` applies. The version id lists do not touch it, so excluding every version in a language still leaves that language in the results.

Filtering runs after the fetch, so a page can come back smaller than the requested `page_size`, and reported totals still count unfiltered server results.

Set the filters when you mount the provider. Changing them later applies to future fetches only — data already fetched is not re-filtered.

## Documentation and API Reference
* [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## License

This SDK is licensed under [Apache 2.0](./LICENSE). 

Licensing information for the Bible versions is available 
at the [YouVersion Platform](https://platform.youversion.com/) site.
