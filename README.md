
![image](/assets/github-react-sdk-banner.png)

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)

# YouVersion Platform React SDK

A comprehensive React SDK for integrating [YouVersion Platform](https://platform.youversion.com/) features into your web applications. This monorepo provides a type-safe API client, React hooks, and ready-to-use components for Bible content.

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0 (required for monorepo development)
- YouVersion Platform App Key ([Get one here](https://platform.youversion.com/))

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

```tsx
import { BibleSDKProvider, YVPProvider, VerseOfTheDay } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: "YOUR_APP_KEY" }}>
        <VerseOfTheDay versionId={111} />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

### Custom Hooks

```tsx
import { BibleSDKProvider, usePassage } from '@youversion/platform-react-hooks';

function BibleVerse() {
  const { passage, loading } = usePassage(111, 'JHN.3.16');
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

const versions = await bibleClient.getVersions('en*');
const passage = await bibleClient.getPassage(111, 'JHN.3.16');
```

## Packages

- **[@youversion/platform-react-ui](packages/ui/README.md)** - Pre-built components with styling
- **[@youversion/platform-react-hooks](packages/hooks/README.md)** - React hooks for custom UI
- **[@youversion/platform-core](packages/core/README.md)** - Type-safe API client

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and workflow.

## License

[Apache 2.0](./LICENSE)
