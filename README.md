![image](/assets/github-react-sdk-banner.png)

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Core Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/youversion/platform-sdk-react/main/.coverage/core.json)
![Hooks Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/youversion/platform-sdk-react/main/.coverage/hooks.json)
![UI Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/youversion/platform-sdk-react/main/.coverage/ui.json)

# YouVersion Platform React SDK

A comprehensive React SDK for integrating [YouVersion Platform](https://platform.youversion.com/) features into your web applications. This monorepo provides a type-safe API client, React hooks, and ready-to-use components for Bible content.

## Quick Start

### NPM packages

This repo contains the source code for three NPM packages which we advise that you install directly:

- UI components: [@youversion/platform-react-ui](https://www.npmjs.com/package/@youversion/platform-react-ui)
- React hooks: [@youversion/platform-react-hooks](https://www.npmjs.com/package/@youversion/platform-react-hooks)
- Direct API access: [@youversion/platform-core](https://www.npmjs.com/package/@youversion/platform-core)

### Installation

```bash
# For UI components
pnpm add @youversion/platform-react-ui

# For React hooks only
pnpm add @youversion/platform-react-hooks

# For direct API access
pnpm add @youversion/platform-core
```

## Quick Start Examples

### UI Components

To display a verse, or a range of verses:
```tsx
import { BibleSDKProvider, BibleTextView } from '@youversion/platform-react-ui';

function App() {
  return (
    <BibleSDKProvider appKey={"YOUR_APP_KEY"}>
      <BibleTextView reference="JHN.1.1-4" versionId={111} />
    </BibleSDKProvider>
  );
}
```

To display the YouVersion Verse of the Day:
```tsx
import { BibleSDKProvider, VerseOfTheDay } from '@youversion/platform-react-ui';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <VerseOfTheDay versionId={111} />
    </BibleSDKProvider>
  );
}
```

### Custom Hooks

```tsx
import { BibleSDKProvider, usePassage } from '@youversion/platform-react-hooks';

function BibleVerse() {
  const { passage, loading } = usePassage({ versionId: 111, usfm: 'JHN.3.16' });
  if (loading) return <div>Loading...</div>;
  return <div dangerouslySetInnerHTML={{ __html: passage?.content || '' }} />;
}

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <BibleVerse />
    </BibleSDKProvider>
  );
}
```

### Core API

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core';

const apiClient = new ApiClient({ appKey: 'YOUR_APP_KEY' });
const bibleClient = new BibleClient(apiClient);

// Find available Bible versions in English
const versions = await bibleClient.getVersions('en*');
console.log(versions.data[0].title);

// Fetch the html text of John 3:16 in that first Bible version
const passage = await bibleClient.getPassage(versions.data[0].id, 'JHN.3.16');
console.log(passage.content);
```

## License

This SDK is licensed under [Apache 2.0](./LICENSE). 

Licensing information for the Bible versions is available 
at the [YouVersion Platform](https://platform.youversion.com/) site.
