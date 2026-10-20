![License](https://img.shields.io/badge/license-Apache%202.0-blue)

# @youversion/platform-core

A type-safe TypeScript SDK for accessing the YouVersion Platform APIs. Get Bible content and build Bible-based applications.

## When to use this package

Use `@youversion/platform-core` when you need:
- ✅ Direct access to YouVersion Platform APIs
- ✅ Server-side/Node.js Bible data fetching
- ✅ Full control over API calls and data handling
- ✅ Minimal dependencies (works anywhere JavaScript runs)

**Use other packages instead if:**
- ❌ Building React components → Use [@youversion/platform-react-hooks](../hooks/README.md) for hooks with state management
- ❌ Need ready-made UI → Use [@youversion/platform-react-ui](../ui/README.md) for production-ready components

## Install

```bash
pnpm add @youversion/platform-core
```

Get your App Key at [platform.youversion.com](https://platform.youversion.com/)

## Usage

```ts
import {
  ApiClient,
  BibleClient,
  SearchClient,
  YouVersionPlatformConfiguration,
} from '@youversion/platform-core';

const apiClient = new ApiClient({
  appKey: 'YOUR_APP_KEY',
});
const bibleClient = new BibleClient(apiClient);

// Optional: limit which Bible versions this app may use (YPE-4657)
YouVersionPlatformConfiguration.permittedLanguageTags = ['en'];
YouVersionPlatformConfiguration.permittedVersionIds = [111, 3034];
YouVersionPlatformConfiguration.excludedVersionIds = [4212];

// Find available Bible versions in English
const versions = await bibleClient.getVersions('en*');
console.log(versions.data[0].title);

// Fetch the html text of John 3:16 in that first Bible version
const passage = await bibleClient.getPassage(versions.data[0].id, 'JHN.3.16');
console.log(passage.content);

// Search (`/v1/*` endpoints; requires an app key authorized for Search)
const searchClient = new SearchClient(apiClient);
const trending = await searchClient.getTrendingQueries('en');
const verses = await searchClient.searchVerses('faith', versions.data[0].id, {
  pageSize: 10,
});
console.log(trending.queries[0]?.text, verses.verses[0]?.id);
```

### Unified search

Use `searchUnified` to fetch top verse references and related topics in one
`GET /v1/search-unified` request:

```ts
const results = await searchClient.searchUnified('faith', 111, ['en'], {
  userIntent: 'topical',
  fields: ['verses', 'topics'],
});
console.log(results.verses[0]?.id, results.topics[0]?.text);
```

Omit `fields` or pass an empty array to include all kinds. The response includes
`didYouMean`, `searchInsteadFor`, and an optional `userIntent`. This unpaginated
snapshot contains top results, not the entire verse result set. Use `searchVerses`
for verse pagination. Verse hits contain passage IDs, not passage text; resolve
text through `BibleClient.getPassage`.

You can also import `searchUnified` and call it with an `ApiClient` as the first
argument, followed by the same arguments as the client method.

Use supported search language codes such as `en`. Valid language-range syntax
does not guarantee backend support; the SDK does not add fallback ranges.

### Display Bible HTML

Use `getPassageDisplay` when you need transformed HTML together with current
attribution and the resources required to apply YouVersion's Bible styles:

```ts
const display = await bibleClient.getPassageDisplay({
  versionId: 3034,
  passageId: 'JHN.3.16',
});

for (const stylesheet of display.stylesheets) {
  console.log(stylesheet.href);
}

console.log(display.html);
console.log(display.attribution.text);
```

The result is declarative. The SDK does not insert the stylesheets or HTML into
your page. On a server, HTML transformation requires the optional `jsdom` peer
dependency.

## Documentation and API Reference
* [developers.youversion.com/sdks/typescript](https://developers.youversion.com/sdks/typescript)

## License

This SDK is licensed under [Apache 2.0](./LICENSE). 

Licensing information for the Bible versions is available 
at the [YouVersion Platform](https://platform.youversion.com/) site.
