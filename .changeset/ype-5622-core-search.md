---
"@youversion/platform-core": minor
---

Add Platform Search APIs to core: `SearchClient` with suggested/trending queries, verse search, and topic search against `/v1/*` endpoints.

PRD-over-Swift notes: query responses use a `{ queries: SearchQuery[] }` wrapper (not a bare array), and `user_intent` is omitted on the wire unless the caller supplies it. Topic results expose `totalSize` from `total_size`. Language ranges accept `en_US` and normalize underscores to hyphens before validation.

The UI package will consume these types via the core `"."` export in a follow-up PR. Public API Extractor compatibility is not updated in this release (api-extractor is not wired in this repo).
