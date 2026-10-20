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
const unified = await searchClient.searchUnified('psalm 23', versions.data[0].id, 'en', {
  fields: ['verses', 'topics'],
});
console.log(trending.queries[0]?.text, verses.verses[0]?.id, unified.topics[0]?.text);
```

Unified search returns one snapshot of top results, not the entire verse result
set. Omit `fields` for all available kinds, or pass a nonempty selection.
`userIntent` accepts `unknown`, `topical`, `text`, or `reference`; response intent
strings remain open-ended.

The SDK also accepts `fields: ['images']` and maps image hits to `{ id, passageId }`,
not image URLs. Image selection requires backend support. A production check on
2026-10-20 returned HTTP 400 for `fields: ['images']`; successful verse/topic
responses omitted images, which the SDK returns as `images: []`.

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
