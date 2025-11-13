![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js >= 20.0.0](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## Table of Contents

- [@youversion/platform-core](#youversionplatform-core)
  - [Overview](#overview)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Features and Capabilities](#features-and-capabilities)
  - [React SDK Packages](#react-sdk-packages)
  - [Configuration](#configuration)
  - [API Reference](#api-reference)
  - [Troubleshooting](#troubleshooting)
  - [Development](#development)
  - [License](#license)
  - [Support](#support)

# @youversion/platform-core

A powerful, type-safe TypeScript SDK for accessing the YouVersion Platform APIs. Get Bible content, search verses, and build Bible-based applications with full authentication support.

## Overview

`@youversion/platform-core` is a published npm package that provides comprehensive API clients for the YouVersion Bible Platform. It enables developers to:

- Access Bible data (versions, books, chapters, verses, passages)
- Authenticate users with OAuth
- Search Bible content
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
- A YouVersion Platform App ID (Get from https://platform.youversion.com/)

## Quick Start

### Basic Bible Content Retrieval

```ts
import { ApiClient, BibleClient } from '@youversion/platform-core'

// Initialize the API client with your App ID
const apiClient = new ApiClient({
  appId: 'YOUR_APP_ID', // Get from https://platform.youversion.com/
})

const bibleClient = new BibleClient(apiClient)

// Get English Bible versions
const versions = await bibleClient.getVersions('en*')
console.log(versions.data[0].title) // "English Standard Version"

// Get a specific passage
const passage = await bibleClient.getPassage(111, 'JHN.3.16')
console.log(passage.content) // "For God so loved the world..."
```

### Authentication Setup

To access protected endpoints (user data), authenticate using a Long Access Token (LAT):

```ts
import { AuthClient, YouVersionPlatformConfiguration } from '@youversion/platform-core'

// Set the access token (e.g., from OAuth flow)
YouVersionPlatformConfiguration.setAccessToken('YOUR_LONG_ACCESS_TOKEN')

const authClient = new AuthClient(apiClient)
const user = await authClient.getUser('YOUR_LONG_ACCESS_TOKEN')
console.log(user.first_name)
console.log(user.id)
```

### OAuth Sign-In Flow

For applications that need to authenticate users via OAuth, use the `YouVersionAPIUsers` utility class:

```ts
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  SignInWithYouVersionPermission
} from '@youversion/platform-core'

// Set your app ID first
YouVersionPlatformConfiguration.appId = 'YOUR_APP_ID'

// Define required and optional permissions
const requiredPermissions = new Set([
  SignInWithYouVersionPermission.bibles
])

const optionalPermissions = new Set([
  SignInWithYouVersionPermission.votd
])

// Initiate sign-in flow
const result = await YouVersionAPIUsers.signIn(requiredPermissions, optionalPermissions)

if (result.accessToken) {
  console.log('User signed in:', result.yvpUserId)
  console.log('Granted permissions:', result.permissions)

  // Get user info
  const userInfo = await YouVersionAPIUsers.userInfo(result.accessToken)
  console.log(userInfo.first_name, userInfo.last_name)
} else if (result.errorMsg) {
  console.error('Sign-in failed:', result.errorMsg)
}

// Sign out when done
YouVersionAPIUsers.signOut()
```

**Available Permissions:**
- `SignInWithYouVersionPermission.bibles` - Access to Bible content
- `SignInWithYouVersionPermission.votd` - Access Verse of the Day
- `SignInWithYouVersionPermission.demographics` - User demographic information
- `SignInWithYouVersionPermission.bibleActivity` - User's Bible reading activity

### Search Functionality

```ts
import { SearchClient } from '@youversion/platform-core'

const searchClient = new SearchClient(apiClient)

const results = await searchClient.search('love', 111)
results.data.forEach(item => {
  console.log(item.usfm) // "JHN.3.16"
  // Note: Use bibleClient.getPassage() to retrieve the actual verse text
})
```

## Features and Capabilities

### Bible Data Access
- Retrieve Bible versions, books, chapters, and verses
- Get formatted passages with optional headings and notes
- Access the complete Bible index structure
- Support for multiple Bible translations

### User Authentication
- OAuth authentication with YouVersion
- Long Access Token (LAT) support
- User profile information retrieval

### Search Functionality
- Full-text Bible search
- Version-specific results
- Search facets and filters

### Language Support
- Query available languages by country
- Get detailed language information
- Support for multiple scripts (e.g., sr-Latn for Serbian Cyrillic)

### Verse of the Day
- Access daily Verses of the Day
- Get the full year's VOTD calendar
- Retrieve specific day's verse

## React SDK Packages

While `@youversion/platform-core` provides the underlying API functionality, you may be looking for React-specific components and hooks:

- **[React Hooks](../../packages/hooks/README.md)** - React hooks for Bible data, verse selection, search, and more
- **[React UI Components](../../packages/ui/README.md)** - Pre-built React components like a Bible readers, Bible version pickers, Bible verse widget, and a Verse of the Day component

### When to use each package

- **Core package**: Direct API access, server-side usage, or building your own React integration
- **React hooks**: When building custom React components with Bible functionality
- **React UI components**: When you want ready-to-use our UI components in your React app

## Configuration

### API Client Configuration

```ts
const apiClient = new ApiClient({
  appId: 'YOUR_APP_ID', // Required: Get from https://platform.youversion.com/
  baseUrl: 'https://api-dev.youversion.com', // Optional: API base URL
  timeout: 10000, // Optional: Request timeout in ms (default: 10000)
  version: 'v1', // Optional: API version (default: "v1")
  installationId: 'my-app-instance', // Optional: Installation identifier
})
```

### Configuration Options

| Option           | Type     | Default                       | Description                                                               |
| ---------------- | -------- | ----------------------------- | ------------------------------------------------------------------------- |
| `appId`          | `string` | **Required**                  | Your application ID for API authentication                               |
| `baseUrl`        | `string` | `"https://api-dev.youversion.com"` | Base URL for the API                                                |
| `timeout`        | `number` | `10000`                       | Request timeout in milliseconds                                          |
| `version`        | `string` | `"v1"`                        | API version to use                                                        |
| `installationId` | `string` | `"web-sdk-default"`           | Unique identifier for this application instance                          |

### Platform Configuration

```ts
import { YouVersionPlatformConfiguration } from '@youversion/platform-core'

// Set global configuration
YouVersionPlatformConfiguration.appId = 'YOUR_APP_ID'
YouVersionPlatformConfiguration.setAccessToken('YOUR_LAT')
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
      abbreviation: "ESV",
      title: "English Standard Version",
      language_tag: "en",
      copyright_short: "© 2001 by Crossway...",
      books: ["GEN", "EXO", ...]
    }
  ]
}
```

---

##### `getVersion(id: number): Promise<BibleVersion>`

Fetch a specific Bible version by ID.

```ts
const esv = await bibleClient.getVersion(111)
console.log(esv.title) // "English Standard Version"
console.log(esv.books) // ["GEN", "EXO", "LEV", ...]
```

**Parameters:**
- `id` (number, required): Bible version ID

---

##### `getBooks(versionId: number, canon?: 'ot' | 'nt' | 'deuterocanon'): Promise<Collection<BibleBook>>`

Fetch all books for a specific Bible version.

```ts
const books = await bibleClient.getBooks(111)

// Filter by canon
const otBooks = await bibleClient.getBooks(111, 'ot')
const ntBooks = await bibleClient.getBooks(111, 'nt')
```

**Parameters:**
- `versionId` (number, required): Bible version ID
- `canon` (string, optional): Filter by canon type - `"ot"` (Old Testament), `"nt"` (New Testament), or `"deuterocanon"`

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
- `include_notes` (boolean, optional): Include footnotes/endnotes in output

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
  abbreviation: "ESV",
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

Fetch the Verse of the Day for the entire year.

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

Fetch the Verse of the Day for a specific day of the year.

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

### SearchClient

Client for full-text Bible search.

#### Methods

##### `search(query: string, versionId: number): Promise<SearchResponse>`

Perform a full-text search over Bible verses.

```ts
const searchClient = new SearchClient(apiClient)

const results = await searchClient.search('The Lord is my shepherd', 111)

results.data.forEach(item => {
  console.log(item.usfm) // "PSA.23.1"
})

// To get the actual verse text, use getPassage()
const verseText = await bibleClient.getPassage(111, results.data[0].usfm)
console.log(verseText.content) // "The Lord is my shepherd..."

// Search in different version
const nltResults = await searchClient.search('love', 206)
```

**Parameters:**
- `query` (string, required): Search phrase
- `versionId` (number, required): Bible version ID

**Response Example:**
```ts
{
  data: [
    {
      usfm: "PSA.23.1"
    }
  ],
  did_you_mean: [],
  filters: {
    books: [{ count: 1, usfm: "PSA" }],
    canons: [{ count: 1, section: "ot" }]
  },
  next_page: false,
  page_size: 20,
  query: "The Lord is my shepherd",
  search_instead_for: null,
  user_intent: "unknown"
}
```

**Note:** Search results only contain USFM identifiers. Use `BibleClient.getPassage()` to retrieve the actual verse text for each result.

---

### YouVersionAPIUsers

Utility class for OAuth authentication flow with YouVersion.

#### Methods

##### `static signIn(requiredPermissions: Set<SignInWithYouVersionPermissionValues>, optionalPermissions: Set<SignInWithYouVersionPermissionValues>): Promise<SignInWithYouVersionResult>`

Initiates the OAuth sign-in flow with YouVersion.

```ts
import { YouVersionAPIUsers, SignInWithYouVersionPermission } from '@youversion/platform-core'

const result = await YouVersionAPIUsers.signIn(
  new Set([SignInWithYouVersionPermission.bibles]),
)

if (result.accessToken) {
  console.log('Access token:', result.accessToken)
  console.log('User ID:', result.yvpUserId)
  console.log('Permissions:', result.permissions)
}
```

**Parameters:**
- `requiredPermissions` (Set, required): Permissions that must be granted for successful sign-in
- `optionalPermissions` (Set, required): Permissions requested but not required

**Returns:** `SignInWithYouVersionResult` with:
- `accessToken: string | null` - The Long Access Token (LAT)
- `yvpUserId: string | null` - The YouVersion user ID
- `permissions: string[]` - Array of granted permissions
- `errorMsg: string | null` - Error message if sign-in failed

---

##### `static signOut(): void`

Clears the stored access token.

```ts
YouVersionAPIUsers.signOut()
```

---

##### `static userInfo(accessToken: string): Promise<YouVersionUserInfo>`

Retrieves user profile information using an access token.

```ts
const userInfo = await YouVersionAPIUsers.userInfo('YOUR_ACCESS_TOKEN')
console.log(userInfo.first_name)
console.log(userInfo.last_name)
console.log(userInfo.id)
console.log(userInfo.getAvatarUrl())
```

**Parameters:**
- `accessToken` (string, required): The Long Access Token from sign-in

**Response Example:**
```ts
{
  id: "user_123",
  first_name: "John",
  last_name: "Doe",
  avatar_url: "https://..."
}
```

---

### AuthClient

Client for user authentication.

#### Methods

##### `getUser(lat: string): Promise<User>`

Retrieve the current authenticated user's profile.

```ts
const authClient = new AuthClient(apiClient)

const user = await authClient.getUser('YOUR_LONG_ACCESS_TOKEN')
console.log(user.first_name)
console.log(user.id)
```

**Parameters:**
- `lat` (string, required): Long Access Token

**Response Example:**
```ts
{
  id: "user_123",
  avatar_url: "https://...",
  first_name: "John",
  last_name: "Doe"
}
```

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
