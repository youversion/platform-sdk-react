![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## Table of Contents

- [@youversion/platform-core](#youversionplatform-core)
  - [Overview](#overview)
  - [Installation](#installation)
  - [When to Use This Package](#when-to-use-this-package)
  - [Related Packages](#related-packages)
  - [Setup & Configuration](#setup--configuration)
  - [Quick Start](#quick-start)
  - [Features and Capabilities](#features-and-capabilities)
  - [Configuration](#configuration)
  - [API Reference](#api-reference)
  - [Troubleshooting](#troubleshooting)
  - [Development](#development)
  - [License](#license)
  - [Support](#support)

# @youversion/platform-core

A type-safe TypeScript SDK for accessing the YouVersion Platform APIs. Get Bible content and build Bible-based applications.

## Overview

`@youversion/platform-core` is a published npm package that provides comprehensive API clients for the YouVersion Bible Platform. It enables developers to:

- Access Bible data (versions, books, chapters, verses, passages)
- Access language information
- Fetch Verse of the Day

Built with TypeScript for type safety and modern JavaScript tooling. This package works in Node.js and browser environments.

For more information about the YouVersion Platform, visit [https://platform.youversion.com/](https://platform.youversion.com/)

## Installation

Install the package from npm:

```bash
npm install @youversion/platform-core
```

Or with pnpm:

```bash
pnpm add @youversion/platform-core
```

Or with yarn:

```bash
yarn add @youversion/platform-core
```

### Prerequisites

- Node.js >= 20.0.0
- TypeScript 4.8+ (for development)
- A YouVersion Platform App Key (Get from https://platform.youversion.com/)

## When to Use This Package

Use `@youversion/platform-core` when you need:
- ✅ Direct access to YouVersion Platform APIs
- ✅ Server-side/Node.js Bible data fetching
- ✅ Full control over API calls and data handling
- ✅ Building custom React integrations
- ✅ Minimal dependencies (works anywhere JavaScript runs)

**Use other packages instead if:**
- ❌ Building React components → Use `@youversion/platform-react-hooks` for hooks with automatic state management
- ❌ Need ready-made UI → Use `@youversion/platform-react-ui` for production-ready components

## Related Packages

This package provides low-level API access. Depending on your use case, you may want to consider related packages:

- **[@youversion/platform-react-hooks](../../packages/hooks/README.md)** - React hooks wrapping this core SDK for easier integration in React applications
- **[@youversion/platform-react-ui](../../packages/ui/README.md)** - Pre-built React components for common Bible features

## Setup & Configuration

Unlike React packages, `@youversion/platform-core` doesn't use providers. Instead, you initialize API clients directly:

1. **Create an ApiClient** with your YouVersion Platform App Key
2. **Use specialized clients** (BibleClient, LanguagesClient) for different API features

### Installation & Initialization

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core'

// Step 1: Initialize the API client (required)
const apiClient = new ApiClient({
  appKey: import.meta.env.YVP_APP_KEY, // Get from https://platform.youversion.com/
})

// Step 2: Create specialized clients as needed
const bibleClient = new BibleClient(apiClient)

// Step 3: Make API calls
const versions = await bibleClient.getVersions('en*')
const passage = await bibleClient.getPassage(111, 'JHN.3.16')
```

## Quick Start

### Basic Bible Content Retrieval with Error Handling

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core'

async function main() {
  try {
    // Initialize the API client with your App Key
    const apiClient = new ApiClient({
      appKey: import.meta.env.YVP_APP_KEY, // Get from https://platform.youversion.com/
    })

    const bibleClient = new BibleClient(apiClient)

    // Get English Bible versions
    const versions = await bibleClient.getVersions('en*')
    console.log(versions.data[0].title) // Bible version title

    // Get a specific passage
    const passage = await bibleClient.getPassage(111, 'JHN.3.16')
    console.log(passage.content) // "For God so loved the world..."
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching Bible data:', error.message)
      
      // Common errors:
      // - "Invalid appKey" - Check your App Key from platform.youversion.com
      // - "Network error" - Check your internet connection
      // - "404 Not Found" - Invalid passage or version ID
    }
  }
}

main()
```

## Features and Capabilities

### Bible Data Access
- Retrieve Bible versions, books, chapters, and verses
- Get formatted passages with optional headings and notes
- Access the complete Bible index structure
- Support for multiple Bible translations

### Language Support
- Query available languages by country
- Get detailed language information
- Support for multiple scripts (e.g., sr-Latn for Serbian Cyrillic)

### Verse of the Day
- Access daily Verses of the Day
- Get the full year's VOTD calendar
- Retrieve specific day's verse

## Configuration

### API Client Configuration

```ts
const apiClient = new ApiClient({
  appKey: import.meta.env.YVP_APP_KEY, // Required: Get from https://platform.youversion.com/
  baseUrl: 'https://api.youversion.com', // Optional: API base URL
  timeout: 10000, // Optional: Request timeout in ms (default: 10000)
})
```

### Configuration Options

| Option           | Type     | Default                       | Description                                                               |
| ---------------- | -------- | ----------------------------- | ------------------------------------------------------------------------- |
| `appKey`          | `string` | **Required**                  | Your App Key for API authentication                               |
| `baseUrl`        | `string` | `"https://api.youversion.com"` | Base URL for the API                                                |
| `timeout`        | `number` | `10000`                       | Request timeout in milliseconds                                          |

### Platform Configuration

```ts
import { YouVersionPlatformConfiguration } from '@youversion/platform-core'

// Set global configuration
YouVersionPlatformConfiguration.appKey = import.meta.env.YVP_APP_KEY
YouVersionPlatformConfiguration.setAccessToken('YOUR_ACCESS_TOKEN')
YouVersionPlatformConfiguration.apiHost = 'api.youversion.com'
```

## API Reference

### BibleClient

The main client for interacting with Bible data.

#### Methods

##### `getVersions(language_ranges: string, license_id?: string | number): Promise<Collection<BibleVersion>>`

Fetch available Bible versions filtered by language ranges.

```ts
// Get all English versions
const englishVersions = await bibleClient.getVersions('en*')

// Get specific language versions
const spanishVersions = await bibleClient.getVersions('es*')

// Get multiple language versions
const multiLangVersions = await bibleClient.getVersions('en*,es*,fr*')

// Filter by license
const licenseVersions = await bibleClient.getVersions('en*', 123)
```

**Parameters:**
- `language_ranges` (string, required): Comma-separated language codes or ranges (e.g., `"en*"`, `"es-ES"`)
- `license_id` (string | number, optional): License ID to filter versions

**Response Example:**
```ts
{
  data: [
    {
      id: 111,
      abbreviation: "NIV",
      title: "New International Version",
      language_tag: "en",
      copyright_short: "© 2011 by Biblica...",
      books: ["GEN", "EXO", ...]
    }
  ]
}
```

---

##### `getVersion(id: number): Promise<BibleVersion>`

Fetch a specific Bible version by ID.

```ts
const niv = await bibleClient.getVersion(111)
console.log(niv.title) // "New International Version"
console.log(niv.books) // ["GEN", "EXO", "LEV", ...]
```

**Parameters:**
- `id` (number, required): Bible version ID

---

##### `getBooks(versionId: number): Promise<Collection<BibleBook>>`

Fetch all books for a specific Bible version.

```ts
const books = await bibleClient.getBooks(111)
```

**Parameters:**
- `versionId` (number, required): Bible version ID

**Response Example:**
```ts
{
  data: [
    {
      id: "GEN",
      title: "Genesis",
      abbreviation: "Gen",
      canon: "ot",
      chapters: ["1", "2", "3", ...]
    }
  ]
}
```

---

##### `getBook(versionId: number, book: string): Promise<BibleBook>`

Fetch a specific book by its USFM identifier.

```ts
const genesis = await bibleClient.getBook(111, 'GEN')
console.log(genesis.title) // "Genesis"
console.log(genesis.chapters.length) // 50
```

**Parameters:**
- `versionId` (number, required): Bible version ID
- `book` (string, required): 3-character USFM book code (e.g., `"GEN"`, `"MAT"`, `"JHN"`)

---

##### `getChapters(versionId: number, book: string): Promise<Collection<BibleChapter>>`

Fetch all chapters for a specific book.

```ts
const chapters = await bibleClient.getChapters(111, 'GEN')
console.log(chapters.data.length) // 50
```

**Parameters:**
- `versionId` (number, required): Bible version ID
- `book` (string, required): 3-character USFM book code

---

##### `getChapter(versionId: number, book: string, chapter: number): Promise<BibleChapter>`

Fetch a specific chapter.

```ts
const genesis1 = await bibleClient.getChapter(111, 'GEN', 1)
console.log(genesis1.title) // "Genesis 1"
```

**Parameters:**
- `versionId` (number, required): Bible version ID
- `book` (string, required): 3-character USFM book code
- `chapter` (number, required): Chapter number

---

##### `getVerses(versionId: number, book: string, chapter: number): Promise<Collection<BibleVerse>>`

Fetch all verses for a specific chapter.

```ts
const verses = await bibleClient.getVerses(111, 'GEN', 1)
console.log(verses.data.length) // 31
```

**Parameters:**
- `versionId` (number, required): Bible version ID
- `book` (string, required): 3-character USFM book code
- `chapter` (number, required): Chapter number

**Response Example:**
```ts
{
  data: [
    {
      id: "GEN.1.1",
      book_id: "GEN",
      chapter_id: "1",
      passage_id: "GEN.1.1",
      reference: "Genesis 1:1"
    }
  ]
}
```

---

##### `getVerse(versionId: number, book: string, chapter: number, verse: number): Promise<BibleVerse>`

Fetch a specific verse.

```ts
const verse = await bibleClient.getVerse(111, 'GEN', 1, 1)
console.log(verse.reference) // "Genesis 1:1"
```

**Parameters:**
- `versionId` (number, required): Bible version ID
- `book` (string, required): 3-character USFM book code
- `chapter` (number, required): Chapter number
- `verse` (number, required): Verse number

---

##### `getPassage(versionId: number, usfm: string, format?: 'html' | 'text', include_headings?: boolean, include_notes?: boolean): Promise<BiblePassage>`

Fetch a passage (one or more verses) with formatted content. **Recommended method for retrieving verse text** instead of individual verse calls.

```ts
// Single verse
const verse = await bibleClient.getPassage(111, 'JHN.3.16')
console.log(verse.content) // "<p>For God so loved the world...</p>"

// Verse range
const passage = await bibleClient.getPassage(111, 'GEN.1.1-5')

// Entire chapter
const chapter = await bibleClient.getPassage(111, 'GEN.1')

// With formatting options
const formatted = await bibleClient.getPassage(111, 'JHN.3.16', 'html', true, true)
```

**Parameters:**
- `versionId` (number, required): Bible version ID
- `usfm` (string, required): USFM reference format (e.g., `"JHN.3.16"`, `"GEN.1.1-5"`, `"MAT.1"`)
- `format` (string, optional): `"html"` or `"text"` (default: `"html"`)
- `include_headings` (boolean, optional): Include section headings in output
- `include_notes` (boolean, optional): Include footnotes/endnotes in output. Note: Paragraphs and tables are always preserved in the output for accurate Bible text formatting.

**Response Example:**
```ts
{
  id: "JHN.3.16",
  bible_id: 111,
  human_reference: "John 3:16",
  content: "<p><span class=\"verse-num\">16</span> For God so loved the world...</p>"
}
```

**Note:** The `content` field contains the formatted text (HTML or plain text depending on the `format` parameter).

---

##### `getIndex(versionId: number): Promise<BibleIndex>`

Fetch the complete indexing structure for a Bible version (all books, chapters, verses).

```ts
const index = await bibleClient.getIndex(111)
console.log(index.books[0].chapters.length) // Structure of entire Bible
```

**Parameters:**
- `versionId` (number, required): Bible version ID

**Response Example:**
```ts
{
  id: 111,
  abbreviation: "NIV",
  books: [
    {
      id: "GEN",
      title: "Genesis",
      chapters: [
        { id: "1", verses: [{ id: "1" }, { id: "2" }, ...] },
        ...
      ]
    },
    ...
  ]
}
```

---

##### `getAllVOTDs(): Promise<Collection<VOTD>>`

Fetch the Verse of the Day for the entire year. Day 1 always represents January 1.

```ts
const allVOTDs = await bibleClient.getAllVOTDs()
console.log(allVOTDs.data[0].day) // 1
console.log(allVOTDs.data[0].passage_id) // "JHN.3.16"
```

**Response Example:**
```ts
{
  data: [
    { day: 1, passage_id: "JHN.3.16" },
    { day: 2, passage_id: "ROM.3.23" },
    ...
  ]
}
```

---

##### `getVOTD(day: number): Promise<VOTD>`

Fetch the Verse of the Day for a specific day of the year. Day 1 always represents January 1.

```ts
// Day 1 of the year
const votd1 = await bibleClient.getVOTD(1)

// Day 100 of the year
const votd100 = await bibleClient.getVOTD(100)

// Day 366 (leap year)
const votd366 = await bibleClient.getVOTD(366)
```

**Parameters:**
- `day` (number, required): Day of the year (1-366)

**Response Example:**
```ts
{
  day: 1,
  passage_id: "JHN.3.16"
}
```

---

### LanguagesClient

Client for accessing language information.

#### Methods

##### `getLanguages(options: GetLanguagesOptions): Promise<Collection<Language>>`

Fetch available languages supported in the platform.

```ts
const languagesClient = new LanguagesClient(apiClient)

// Get languages available in United States
const usLanguages = await languagesClient.getLanguages({
  country: 'US',
})

// Get with pagination
const page2 = await languagesClient.getLanguages({
  country: 'US',
  page_size: 10,
  page_token: 'next_page_token_from_previous_response',
})
```

**Parameters:**
- `options` (GetLanguagesOptions, required):
  - `country` (string, required): ISO 3166-1 alpha-2 country code (e.g., `"US"`, `"BR"`, `"MX"`)
  - `page_size` (number, optional): Results per page
  - `page_token` (string, optional): Pagination token from previous response

**Response Example:**
```ts
{
  data: [
    {
      id: "en",
      language: "en",
      script: "Latn",
      display_names: { "en": "English" },
      countries: ["US"],
      text_direction: "ltr"
    },
    {
      id: "es",
      language: "es",
      script: "Latn",
      display_names: { "en": "Spanish", "es": "Español" },
      countries: ["US", "MX", "ES"],
      text_direction: "ltr"
    }
  ]
}
```

**Note:** The Language type contains many additional optional fields including `script_name`, `aliases`, `scripts`, `variants`, `writing_population`, `speaking_population`, and `default_bible_version_id`.

---

##### `getLanguage(languageId: string): Promise<Language>`

Fetch details about a specific language.

```ts
const english = await languagesClient.getLanguage('en')
console.log(english.display_names?.en) // "English"

// With script specification
const serbianCyrillic = await languagesClient.getLanguage('sr-Cyrl')
```

**Parameters:**
- `languageId` (string, required): BCP 47 language code (e.g., `"en"`, `"es"`, `"sr-Cyrl"`)

---

## Troubleshooting

### "Version not found" Error (404)

**Solution:** Verify the version ID exists and is supported:

```ts
// Check available versions first
const versions = await bibleClient.getVersions('en*')
const validIds = versions.data.map(v => v.id)
console.log('Valid version IDs:', validIds)
```

---

### Invalid Language Format

Error message: `Language ID must match BCP 47 format`

**Solution:** Use proper BCP 47 language codes:

```ts
// Valid formats
await languagesClient.getLanguage('en')      // English
await languagesClient.getLanguage('es')      // Spanish
await languagesClient.getLanguage('sr-Cyrl') // Serbian Cyrillic
await languagesClient.getLanguage('zh-Hans') // Chinese Simplified
```

---

## Development

### Local Development

For contributing to this package:

```bash
# From monorepo root
pnpm install

# Build the package
pnpm build:core

# Run tests
pnpm --filter @youversion/platform-core test

# Watch mode
pnpm --filter @youversion/platform-core test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

### Testing

The core package includes comprehensive unit tests:

```bash
# Run tests with coverage
pnpm --filter @youversion/platform-core test:coverage

# Watch mode for development
pnpm --filter @youversion/platform-core test:watch
```

---

## License

See [LICENSE](../../LICENSE)

## Support

For support and questions:

- Open an issue in the [GitHub repository](https://github.com/youversion/platform-sdk-react)
- Visit [https://platform.youversion.com/](https://platform.youversion.com/) for developer resources
- Check existing documentation and examples in this README
- See [YouVersion Platform SDK Monorepo](../../README.md) for the full SDK overview and all packages
