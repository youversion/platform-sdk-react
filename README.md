![image](/assets/github-react-sdk-banner.png)

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Node.js >= 22.13](https://img.shields.io/badge/Node.js-%3E%3D%2022.13-339933?logo=node.js&logoColor=white)

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
import { YouVersionProvider, BibleTextView } from '@youversion/platform-react-ui';

function App() {
  return (
    <YouVersionProvider appKey={"YOUR_APP_KEY"}>
      <BibleTextView reference="JHN.1.1-4" versionId={3034} />
    </YouVersionProvider>
  );
}
```

To display the YouVersion Verse of the Day:
```tsx
import { YouVersionProvider, VerseOfTheDay } from '@youversion/platform-react-ui';

function App() {
  return (
    <YouVersionProvider appKey="YOUR_APP_KEY">
      <VerseOfTheDay versionId={3034} />
    </YouVersionProvider>
  );
}
```

### Custom Hooks

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

## Contributing

> [!NOTE]
> We are not yet accepting pull requests from external contributors, though we intend to do so in the future. In the meantime, we welcome you to use the SDK, report bugs via [GitHub Issues](https://github.com/youversion/platform-sdk-react/issues), and share feedback. See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

### Package manager

This is a pnpm workspace — the `workspace:*` dependencies between packages are a pnpm feature, so npm and yarn are not supported. The required pnpm version is pinned in `package.json` via `packageManager` (and `engines.pnpm`).

The Git hooks prefer [Corepack](https://nodejs.org/api/corepack.html) (`corepack pnpm ...`) so a newer global pnpm on your PATH can't change how commits are linted or staged files are formatted, and fall back to plain `pnpm` where corepack isn't present.

To get the pinned-pnpm guarantee, enable Corepack once:

```bash
corepack enable
```

Note: **Node 25+ no longer bundles Corepack** — on newer Node, install it first (`npm install -g corepack`) or just rely on the `pnpm` fallback with a locally-installed pnpm that satisfies `engines.pnpm`. See [docs/release-hardening-decisions.md](./docs/release-hardening-decisions.md) (Decision 2) for the rationale and the plan to revisit once Corepack's successor settles.

## License

This SDK is licensed under [Apache 2.0](./LICENSE). 

Licensing information for the Bible versions is available 
at the [YouVersion Platform](https://platform.youversion.com/) site.
