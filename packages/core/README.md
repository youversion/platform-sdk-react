# @youversion/platform-core

A powerful, type-safe TypeScript library for interacting with Bible data. This package provides a comprehensive API client for fetching Bible versions, books, chapters, verses, and user authentication from the YouVersion Bible API.

## 🚀 Features

- **🔒 Type-safe API** - Full TypeScript support with comprehensive type definitions
- **🌐 Multi-language support** - Access Bible versions in multiple languages
- **📚 Complete Bible data** - Versions, books, chapters, verses, and metadata
- **🔐 User authentication** - Secure user authentication with Long Access Tokens (LAT)
- **⚡ Lightweight** - Minimal dependencies with tree-shaking support
- **🎯 Easy to use** - Simple, intuitive API design
- **📦 Modern packaging** - CommonJS and ES Module support

## 📦 Installation

```bash
# npm
npm install @youversion/platform-core

# yarn
yarn add @youversion/platform-core

# pnpm
pnpm add @youversion/platform-core
```

## 🔑 Getting Started

Before using the library, you'll need to obtain an App ID from the [YouVersion Developer Portal](https://developers.youversion.com/). This is required for API authentication.

## 🏃 Quick Start

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core'

// Initialize the API client
const apiClient = new ApiClient({
  appId: 'YOUR_APP_ID', // Required: Get your App ID from https://developers.youversion.com/
})

// Create a Bible client
const bibleClient = new BibleClient(apiClient)

// Fetch Bible versions
const versions = await bibleClient.getVersions('en*')

// Get a specific version
const version = await bibleClient.getVersion(206) // ESV

// Fetch books for a version
const books = await bibleClient.getBooks(206)

// Get a specific chapter
const chapter = await bibleClient.getChapter(206, 'GEN', 1)
const chapterContent = await bibleClient.getPassage(206, chapter.passage_id)
```

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

## 🔧 Development

### Prerequisites

- Node.js 18+
- TypeScript 4.8+

### Building

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests (from monorepo root for consistency)
pnpm test

# Run linting
npm run lint
```

## 📄 License

This package is part of the YouVersion Bible SDK and is subject to YouVersion's terms of service.

## 🤝 Contributing

This is an internal YouVersion package. For issues or feature requests, please contact the YouVersion development team.

## 📚 Related Packages

- `@youversion/platform-react-ui` - React UI components for Bible applications
