# @youversion/platform-core

## OVERVIEW
Foundation package providing pure TypeScript API clients for YouVersion services with zero React dependencies. Also provides framework-agnostic browser CSS (design tokens, preflight reset, Bible reader typography) so any web platform can render Bible content with proper styling.

**Related packages:**
- For React hooks wrapping these clients → see `packages/hooks/AGENTS.md`
- For pre-built UI components → see `packages/ui/AGENTS.md`

## STRUCTURE
```
schemas/                     # Zod schemas for all data types (schema-first design)
styles/                      # Browser CSS (exported via ./browser/styles/*)
  fonts.css                  # Google Fonts import (Inter, Source Serif 4)
  theme.css                  # --yv-* design tokens on :root, dark mode, scoped preflight
  bible-reader.css           # USFM/Bible typography for [data-slot='yv-bible-renderer']
  index.css                  # Barrel: imports fonts + theme + bible-reader
client.ts                    # ApiClient - main HTTP client
bible.ts                     # BibleClient - Bible data operations
languages.ts                 # LanguagesClient - language data
highlights.ts                # HighlightsClient - user highlights
YouVersionAPI.ts             # Base YouVersion API client
SignInWithYouVersionPKCE.ts  # PKCE auth implementation
StorageStrategy.ts           # Storage interface (SessionStorage, MemoryStorage)
bible-html-transformer.ts    # Runtime-agnostic transformer (also contains browser convenience fn)
bible-html-transformer-server.ts # Server convenience wrapper (uses jsdom)
browser.ts                   # Browser entry point
server.ts                    # Server entry point
index.ts                     # Main entry point (runtime-agnostic)
```

## PUBLIC API

### TypeScript (`@youversion/platform-core`)
- `ApiClient`: Main HTTP client with auth handling
- `BibleClient`: Fetch Bibles, chapters, verses, versions
- `LanguagesClient`: Get available languages
- `HighlightsClient`: Manage user highlights
- `SignInWithYouVersionPKCE()`: PKCE auth flow function
- `SessionStorage`, `MemoryStorage`: Storage strategies
- `transformBibleHtml`: Runtime-agnostic Bible HTML transformer (requires DOM adapters)
- `TransformBibleHtmlOptions`: Options for DOM parsing and serialization

### Browser CSS (`@youversion/platform-core/browser/styles/*`)
- `index.css`: All-in-one import (fonts + theme + bible-reader)
- `theme.css`: `--yv-*` design tokens on `:root` + dark mode (`[data-yv-theme='dark']`) + scoped preflight
- `bible-reader.css`: USFM typography for `[data-slot='yv-bible-renderer']` or `[data-yv-sdk-bible-reader]`
- `fonts.css`: Google Fonts import (Inter, Source Serif 4)

## DOs / DON'Ts

✅ Do: Keep this package **framework-agnostic**, but if you must target server or browser, those files must export from `/server` or `/browser`
✅ Do: Define all input/output types in `schemas/` using Zod; schemas are the single source of truth
✅ Do: Reuse `YouVersionAPI` base client for new service clients
✅ Do: Parse API responses with Zod schemas for validation

❌ Don't: Import React, `window`, `document`, or browser storage APIs, but if you must target the browser, those files must export from `/browser`
❌ Don't: Bypass Zod validation for API responses
❌ Don't: Implement UI, hooks, or React state here

## ENVIRONMENT-SPECIFIC EXPORTS

The Bible HTML transformer provides both a runtime-agnostic core and environment-specific convenience wrappers:

- `@youversion/platform-core` → Runtime-agnostic `transformBibleHtml` (requires DOM adapters)
- `@youversion/platform-core/browser` → Browser convenience wrapper (uses native DOMParser)
- `@youversion/platform-core/server` → Server convenience wrapper (uses jsdom)

**Examples:**

```ts
// Runtime-agnostic (works anywhere with custom adapters)
import { transformBibleHtml } from '@youversion/platform-core';

const result = transformBibleHtml(html, {
  parseHtml: (h) => new DOMParser().parseFromString(h, 'text/html'),
  serializeHtml: (doc) => doc.body.innerHTML,
});

// Browser convenience (uses native DOMParser)
import { transformBibleHtml } from '@youversion/platform-core/browser';

const result = transformBibleHtml(html);

// Server convenience (uses jsdom, requires: npm install jsdom)
import { transformBibleHtml } from '@youversion/platform-core/server';

const result = transformBibleHtml(html);
```

**Why separate entry points?**

This architecture keeps the main export truly runtime-agnostic while providing ergonomic convenience wrappers for common environments. The separate `/browser` and `/server` entry points ensure optimal bundle sizes. `package.json` also maps `"browser": { "jsdom": false }` so Vite/Rollup client builds stub jsdom even when the main entry's dynamic `import('jsdom')` is present (Node-only path; browsers use native `DOMParser`).

## ADDING A NEW ENDPOINT OR CLIENT

1. **Define types** in `schemas/` using Zod:
   - Request payload schema
   - Response schema
2. **Extend or add a client**:
   - Prefer extending existing clients (e.g., `BibleClient`) when the endpoint logically belongs there
   - Otherwise, create `xyz.ts` with a new `XyzClient` that composes `YouVersionAPI`
3. **Wire validation**:
   - Parse API responses with the corresponding Zod schema
   - Throw or return typed errors on validation failure
4. **Export from public API**:
   - Expose the new client/types from the main entry file so consumers can import them
5. **Add tests**:
   - Unit tests with MSW for mock responses
   - Optional integration tests guarded by `INTEGRATION_TESTS=true`

## HTTP & CONFIGURATION

- HTTP client: Native `fetch` API
- Base client: `YouVersionAPI` handles base URL, headers, auth tokens
- All clients extend or compose `YouVersionAPI` for consistent HTTP behavior

## CONVENTIONS
- Schema-first: All types defined in schemas/*.ts using Zod
- Zero React: Pure TypeScript, no React dependencies
- Storage: Abstract via StorageStrategy interface
- Auth: PKCE flow with pluggable storage backends
- Error handling: Zod validation for all API responses
- Browser CSS: Plain CSS only (no Tailwind, no preprocessors), served from `src/styles/` without a build step
- Two export namespaces: `"."` for TS (framework-agnostic), `"./browser"` for browser environments, and `"./server` for server environments

## TESTING

- Run tests: `pnpm --filter @youversion/platform-core test`
- Framework: Vitest with Node environment
- Mocking: MSW for API endpoints
- Integration tests:
  - Guarded by `INTEGRATION_TESTS=true`
  - Only run in CI or when explicitly needed; default to mocked tests
- Coverage: @vitest/coverage-v8
