![License](https://img.shields.io/badge/license-Apache%202.0-blue)

# @youversion/platform-core

Type-safe TypeScript SDK for accessing YouVersion Platform APIs.

## Install

```bash
pnpm add @youversion/platform-core
```

Get your App Key at [platform.youversion.com](https://platform.youversion.com/)

## Usage

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core'

// Initialize API client
const apiClient = new ApiClient({
  appKey: import.meta.env.YVP_APP_KEY,
})

const bibleClient = new BibleClient(apiClient)

// Get English Bible versions
const versions = await bibleClient.getVersions('en*')
console.log(versions.data[0].title)

// Get a specific passage
const passage = await bibleClient.getPassage(111, 'JHN.3.16')
console.log(passage.content) // "For God so loved the world..."
```

---

**API Reference:** [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)
