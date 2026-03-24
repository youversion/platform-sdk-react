---
'@youversion/platform-core': minor
'@youversion/platform-react-ui': minor
---

**`@youversion/platform-core`**: Add `transformBibleHtml` — a runtime-agnostic Bible HTML transformer with new `/browser` and `/server` subpath exports.

- `@youversion/platform-core` — runtime-agnostic core; accepts `parseHtml`/`serializeHtml` adapters so it works with any DOM implementation
- `@youversion/platform-core/browser` — zero-config convenience wrapper using the native `DOMParser`
- `@youversion/platform-core/server` — zero-config convenience wrapper using `linkedom` (optional peer dependency)

The transformer sanitizes API HTML (custom allowlist-based sanitizer, no DOMPurify dependency), wraps verse content for CSS targeting, and embeds footnote data as `data-verse-footnote` / `data-verse-footnote-content` attributes directly in the HTML.

**`@youversion/platform-react-ui`**: Migrate Bible HTML transformation from the UI package to `@youversion/platform-core/browser`.

- Removed `isomorphic-dompurify` dependency (lighter bundle)
- Footnote popover data is now read from DOM attributes at render time instead of a separate data structure
- Added SSR safety guard — `Verse.Html` returns raw HTML during server rendering and transforms on the client after hydration
