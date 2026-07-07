---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
---

Fix `HighlightsClient` to match the live highlights API contract. The client previously sent requests the API rejects on every call (401/400), so highlights could never be fetched, created, or deleted.

- Auth token is now sent as an `Authorization: Bearer <token>` header instead of a `lat` query parameter
- Query/body fields now use the API's `bible_id` naming on the wire (the SDK keeps `version_id` in its public types and maps at the boundary)
- `createHighlight` now sends the required `{ request_id, highlight: { ... } }` envelope for idempotent retries
- `getHighlights` now requires `version_id` and `passage_id` (verse or chapter USFM), and `deleteHighlight` requires `version_id`, matching the API's required parameters; `useHighlights` options are updated accordingly
- API responses are validated with Zod and mapped from the wire shape
