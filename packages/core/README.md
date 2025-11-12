![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## Table of Contents

- [@youversion/platform-core](#youversionplatform-core)
  - [🎯 For Different Use Cases](#-for-different-use-cases)
  - [🏗 Architecture](#-architecture)
  - [🚀 Getting Started](#-getting-started)
  - [📦 Packages](#-packages)
  - [🛠 Development](#-development)
  - [🧪 Testing](#-testing)
  - [📝 Contributing](#-contributing)
  - [🔧 Configuration](#-configuration)
  - [📖 API Reference](#-api-reference)
  - [🔍 TypeScript Types](#-typescript-types)
  - [🎯 Common Use Cases](#-common-use-cases)
  - [🚦 Error Handling](#-error-handling)
  - [📄 License](#-license)
  - [🤝 Support](#-support)

# @youversion/platform-core

A powerful, type-safe TypeScript library for interacting with Bible data. This package provides a comprehensive API client for fetching Bible versions, books, chapters, verses, and user authentication from the YouVersion Bible API.

Built with TypeScript for type safety and modern JavaScript tooling.

## 🎯 For Different Use Cases

### 🔧 API Integration

Need direct access to YouVersion Platform APIs? This core package provides the foundational API client for advanced integration patterns, [see our full API documentation here](https://developers.youversion.com/overview).

## 🏗 Architecture

The core package serves as the internal foundation for the YouVersion Platform SDK ecosystem. It encapsulates:

- **API Client Layer**: Handles HTTP requests, authentication, and error management
- **Bible Data Models**: Type-safe interfaces for Bible versions, books, chapters, and verses
- **Authentication Strategies**: Secure user authentication with Long Access Tokens
- **Utility Functions**: Helpers for data processing and API interactions

This package is bundled into published SDKs and is not distributed separately.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0 (for monorepo development)
- TypeScript 4.8+

For contribution to this package, ensure you have the full monorepo setup as described in the [main README](../README.md).

### Installation

This is an internal package. For development within the monorepo:

```bash
# From monorepo root
pnpm install
```

For external use, the functionality is available through published SDK packages.

## 📦 Packages

### @youversion/platform-core (Internal)

TypeScript library for Bible data interaction.

This package contains shared business logic and is bundled into the published `@youversion/platform-react-ui` SDK. It is not published separately.

## 🛠 Development

### Prerequisites

- Node.js >= 20.0.0
- TypeScript 4.8+

### Building

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build the library
pnpm build:core

# Run tests (from monorepo root for consistency)
pnpm test

# Run linting
pnpm lint
```

## 🧪 Testing

The core package includes comprehensive unit tests using Vitest.

```bash
# Run tests for core package
pnpm --filter @youversion/platform-core test

# Run tests with coverage
pnpm --filter @youversion/platform-core test:coverage

# Watch mode for development
pnpm --filter @youversion/platform-core test:watch
```

**Testing Architecture:**
- **Vitest**: Consistent testing framework across the monorepo
- **Unit Tests**: Cover API clients, data models, and utilities
- **Integration Tests**: Validate API interactions and error handling

## 📝 Contributing

This is an internal YouVersion package. For contributions:

1. Follow the monorepo contribution guidelines in the [main README](../README.md)
2. Ensure changes maintain backward compatibility
3. Add tests for new functionality
4. Update documentation as needed

For issues or feature requests, please contact the YouVersion development team.

## 🔧 Configuration

### API Configuration

```ts
import { ApiClient } from '@youversion/platform-core'

const apiClient = new ApiClient({
  appId: 'YOUR_APP_ID', // Required: Get your App ID from https://developers.youversion.com/
  baseUrl: 'https://api.youversion.com', // Optional: API base URL
  timeout: 10000, // Optional: Request timeout in ms (default: 10000)
  version: 'v1', // Optional: API version (default: "v1")
})
```

### Configuration Options

| Option           | Type     | Default                            | Description                                                                               |
| ---------------- | -------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `appId`          | `string` | **Required**                       | Your application ID for API authentication. Get one at https://developers.youversion.com/ |
| `baseUrl`        | `string` | `"https://api-dev.youversion.com"` | Base URL for the API                                                                      |
| `timeout`        | `number` | `10000`                            | Request timeout in milliseconds                                                           |
| `version`        | `string` | `"v1"`                             | API version to use                                                                        |

## 📖 API Reference

### BibleClient

The main client for interacting with Bible data.

#### Methods

##### `getVersions(language_ranges: string): Promise<Collection<Version>>`

Fetch available Bible versions filtered by language. The `language_ranges` parameter is required.

```ts
// Get all English versions
const englishVersions = await bibleClient.getVersions('en*')

// Get specific language versions
const spanishVersions = await bibleClient.getVersions('es*')

// Get multiple language versions
const multiLangVersions = await bibleClient.getVersions('en*,es*,fr*')
```

##### `getVersion(id: number): Promise<Version>`

Fetch a specific Bible version by ID.

```ts
const esv = await bibleClient.getVersion(111)
console.log(esv.title) // "English Standard Version"
```

##### `getBooks(versionId: number): Promise<Collection<Book>>`

Fetch all books for a specific Bible version.

```ts
const books = await bibleClient.getBooks(206)
```

##### `getBook(versionId: number, book: string): Promise<BibleBook>`

Fetch a specific book by its USFM identifier.

```ts
const genesis = await bibleClient.getBook(111, 'GEN')
console.log(genesis.title) // "Genesis"
```

##### `getChapters(versionId: number, book: string): Promise<Collection<BibleChapter>>`

Fetch all chapters for a specific book.

```ts
const chapters = await bibleClient.getChapters(206, 'GEN')
```

##### `getChapter(versionId: number, book: string, chapter: number): Promise<BibleChapter>`

Fetch a specific chapter.

```ts
const genesis1 = await bibleClient.getChapter(206, 'GEN', 1)
const content = await bibleClient.getPassage(206, genesis1.passage_id)
```

##### `getVerses(versionId: number, book: string, chapter: number): Promise<Collection<BibleVerse>>`

Fetch all verses for a specific chapter.

```ts
const verses = await bibleClient.getVerses(111, 'GEN', 1)
verses.data.forEach((verse) => {
  const passage = await bibleClient.getPassage(206, verse.passage_id)
})
```

##### `getVerse(versionId: number, book: string, chapter: number, verse: number): Promise<BibleVerse>`

Fetch a specific verse.

```ts
const verse = await bibleClient.getVerse(111, 'GEN', 1, 1)
console.log('Verse reference:', verse.reference)
const passage = await bibleClient.getPassage(111, verse.passage_id)
console.log('Content:', passage.content) // "In the beginning, God created the heavens and the earth."
```

### AuthClient

Client for user authentication and user data.

#### Methods

##### `getUser(lat: string): Promise<User>`

Retrieve the current authenticated user using a Long Access Token.

```ts
import { AuthClient } from '@youversion/platform-core'

const authClient = new AuthClient(apiClient)
const user = await authClient.getUser('YOUR_LONG_ACCESS_TOKEN')
```

## 🔍 TypeScript Types

The library provides comprehensive TypeScript types for all API responses:

### Core Types

```ts
type BibleVersion = {
  id: number
  abbreviation: string
  copyright_long: string
  copyright_short: string
  info: string
  publisher_url: string
  language_tag: string
  local_abbreviation: string
  local_title: string
  title: string
  books: Array<string>
}

interface BibleBook {
  id: string
  title: string
  abbreviation: string
  canon: string
  chapters: Array<string>
}

interface BibleChapter {
  id: string
  book_id: string
  passage_id: string
  title: string
  // ... additional fields
}

interface BibleVerse {
  id: string
  book_id: string
  chapter_id: string
  passage_id: string
  reference: string
  // ... additional fields
}

interface Collection<T> {
  data: T[]
  // ... pagination and metadata
}
```

## 🎯 Common Use Cases

### 1. Building a Bible Reading App

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core'

class BibleApp {
  private bibleClient: BibleClient

  constructor(appId: string) {
    const apiClient = new ApiClient({ appId })
    this.bibleClient = new BibleClient(apiClient)
  }

  async loadChapter(versionId: number, bookUsfm: string, chapterNum: number) {
    const chapter = await this.bibleClient.getChapter(versionId, bookUsfm, chapterNum)
    const verses = await this.bibleClient.getVerses(versionId, bookUsfm, chapterNum)

    return {
      chapter,
      verses: verses.data,
    }
  }

  async searchVersions(languageCode: string) {
    const versions = await this.bibleClient.getVersions(`${languageCode}*`)
    return versions.data
  }
}
```

### 2. Creating a Verse Reference Tool

```ts
async function getVerseReference(reference: string, versionId: number) {
  // Parse reference like "GEN 1:1"
  const [book, chapterVerse] = reference.split(' ')
  const [chapter, verse] = chapterVerse.split(':')

  const verseData = await bibleClient.getVerse(versionId, book, parseInt(chapter), parseInt(verse))
  const passage = await bibleClient.getPassage(versionId, verseData.passage_id)

  return {
    reference,
    content: passage.content,
    version: await bibleClient.getVersion(versionId),
  }
}
```

### 3. Multi-language Bible Comparison

```ts
async function compareVerses(book: string, chapter: number, verse: number, versionIds: number[]) {
  const comparisons = await Promise.all(
    versionIds.map(async (versionId) => {
      const [version, verseData] = await Promise.all([
        bibleClient.getVersion(versionId),
        bibleClient.getVerse(versionId, book, chapter, verse),
      ])

      const passage = await bibleClient.getPassage(versionId, verseData.passage_id)
      return {
        version: version.title,
        language: version.language_tag,
        content: passage.content,
      }
    })
  )

  return comparisons
}
```

## 🚦 Error Handling

The library uses standard HTTP status codes and provides meaningful error messages:

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core'

try {
  const bibleClient = new BibleClient(new ApiClient({ appId: 'YOUR_APP_ID' })) // Get App ID from https://developers.youversion.com/
  const version = await bibleClient.getVersion(999999) // Non-existent version
} catch (error) {
  if (error.response?.status === 404) {
    console.error('Version not found')
  } else if (error.response?.status === 401) {
    console.error('Authentication failed - check your App ID')
  } else {
    console.error('An error occurred:', error.message)
  }
}
```

## 📄 License

This package is part of the YouVersion Platform react SDK and is subject to YouVersion's licensing and terms of service.

## 🤝 Support

For support, please open an issue in the GitHub repository.
