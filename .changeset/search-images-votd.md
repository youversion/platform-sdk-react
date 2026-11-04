---
'@youversion/platform-core': minor
---

Add paginated `searchImages` for `GET /v1/search-images`. Pass the same query, version id, and `pageSize` on each page, then pass `nextPageToken` back as `pageToken`. An empty page can still include a token. HTTP 204 is an error.

Verse-of-the-day reads move from `/v1/verse_of_the_days` to the canonical `/v1/verse-of-the-days` routes for both single days and the calendar. Pass `language_ranges` to send `language_ranges[]`. Parsed `VOTD` results guarantee `image_id: string | null`, including `null` when the API omits the field. Use `VOTDInput` for caller-created values that omit `image_id`.

VOTD reads now validate responses instead of returning unchecked bodies. `getAllVOTDs` requires a `{ data: [...] }` collection envelope. Both methods reject malformed responses with an `Unexpected verse-of-the-day API response` error, including invalid day, passage, or image field types.
