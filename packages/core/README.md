![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

# @youversion/platform-core

A type-safe TypeScript SDK for accessing the YouVersion Platform APIs. Get Bible content and build Bible-based applications.

## Overview

`@youversion/platform-core` provides comprehensive API clients for the YouVersion Bible Platform. Access Bible versions, books, chapters, verses, language information, and Verse of the Day. Built with TypeScript for type safety and works in Node.js and browser environments.

> **📚 Full Documentation:** [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## Installation

```bash
pnpm add @youversion/platform-core
```

### Prerequisites

- Node.js >= 20.0.0
- YouVersion Platform App Key ([Get from platform.youversion.com](https://platform.youversion.com/))

## When to Use This Package

Use `@youversion/platform-core` when you need:
- ✅ Direct access to YouVersion Platform APIs
- ✅ Server-side/Node.js Bible data fetching
- ✅ Full control over API calls and data handling
- ✅ Minimal dependencies (works anywhere JavaScript runs)

**Use other packages instead if:**
- ❌ Building React components → Use [@youversion/platform-react-hooks](../hooks/README.md) for hooks with state management
- ❌ Need ready-made UI → Use [@youversion/platform-react-ui](../ui/README.md) for production-ready components

## Related Packages

- **[@youversion/platform-react-hooks](../hooks/README.md)** - React hooks wrapping this core SDK
- **[@youversion/platform-react-ui](../ui/README.md)** - Pre-built React components

## Quick Start

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

## Features

- Retrieve Bible versions, books, chapters, verses, and passages
- Get formatted passages with optional headings and notes
- Access the complete Bible index structure
- Query available languages by country
- Get Verse of the Day

## Configuration

```ts
const apiClient = new ApiClient({
  appKey: import.meta.env.YVP_APP_KEY, // Required
  baseUrl: 'https://api.youversion.com', // Optional
  timeout: 10000, // Optional (default: 10000ms)
})
```

## Troubleshooting

### "Invalid appKey" Error

**Solution:** Verify your App Key from [platform.youversion.com](https://platform.youversion.com/). Check for typos or extra whitespace.

### "Version not found" Error (404)

**Solution:** Verify the version ID exists:

```ts
const versions = await bibleClient.getVersions('en*')
const validIds = versions.data.map(v => v.id)
console.log('Valid version IDs:', validIds)
```

## Development

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development instructions.

## License

See [LICENSE](../../LICENSE)

## Support

- GitHub Issues: [Create an issue](https://github.com/youversion/platform-sdk-react/issues)
- Platform Docs: [platform.youversion.com](https://platform.youversion.com/)
- Monorepo: [YouVersion Platform SDK](../../README.md)
