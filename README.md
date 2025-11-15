
![image](/assets/github-react-sdk-banner.png)

![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Turbo](https://img.shields.io/badge/Turbo-v2.0.0-000000?logo=turbo&logoColor=white)
![tsup](https://img.shields.io/badge/tsup-TypeScript%20bundling%20for%20React%20SDK-3178C6?logo=typescript&logoColor=white)

![pnpm >= 9.0.0](https://img.shields.io/badge/pnpm-%3E%3D%209.0.0%20(required%20for%20workspace%20management)-F69220?logo=pnpm&logoColor=white)
![Changesets](https://img.shields.io/badge/Changesets-Version%20management%20%26%20changelog%20generation-8A2BE2?logo=gitbook&logoColor=white)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

# YouVersion Platform React SDK

A comprehensive React SDK for integrating [YouVersion Platform](https://platform.youversion.com/) features into your web applications. This monorepo provides a type-safe API client, React hooks, and ready-to-use components for Bible content.

> **📚 Full Documentation:** [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## Which Package Should I Use?

**[@youversion/platform-react-ui](packages/ui/README.md)** - Pre-built React components with styling included. Use this for ready-made Bible verse displays, chapter navigation, and reading experiences.

**[@youversion/platform-react-hooks](packages/hooks/README.md)** - React hooks for building custom components. Use this when you want full control over UI while using declarative data fetching.

**[@youversion/platform-core](packages/core/README.md)** - Type-safe API client for direct access to YouVersion Platform. Use this for Node.js applications or when React isn't needed.

**For AI applications** - See [YouVersion LLM documentation](https://developers.youversion.com/for-llms) for endpoints optimized for language models.

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

All packages use unified versioning and are released together.

- **[@youversion/platform-core](packages/core/README.md)** - Core TypeScript SDK for API access
- **[@youversion/platform-react-hooks](packages/hooks/README.md)** - React hooks wrapping core SDK
- **[@youversion/platform-react-ui](packages/ui/README.md)** - Production-ready UI components

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, build commands, and testing instructions.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

See [LICENSE](./LICENSE)

## Support

For support, please open an issue in the GitHub repository or visit [https://platform.youversion.com/](https://platform.youversion.com/) for developer resources.
