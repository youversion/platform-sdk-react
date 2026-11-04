---
'@youversion/platform-core': minor
---

Add paginated `searchImages` for `GET /v1/search-images`. Pass the same query, version id, and `pageSize` on each page, then pass `nextPageToken` back as `pageToken`. An empty page can still include a token. Empty success bodies, including HTTP 204, reject with `search-images returned no content; expected a JSON response`.

Verse-of-the-day reads move from `/v1/verse_of_the_days` to the canonical `/v1/verse-of-the-days` routes for both single days and the calendar. Pass `language_ranges` to send `language_ranges[]`. Core client methods return `VOTDResponse` records with a guaranteed `image_id: string | null`, including `null` when the API omits the field. The existing `VOTD` type and hook overrides still accept values without `image_id`.

VOTD reads now validate responses instead of returning unchecked bodies. `getAllVOTDs` requires a `{ data: [...] }` collection envelope. Both methods reject malformed responses with an `Unexpected verse-of-the-day API response` error, including invalid day, passage, or image field types.
