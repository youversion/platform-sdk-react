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

**API Reference:** [developers.youversion.com/sdks/typescript](https://developers.youversion.com/sdks/typescript)
