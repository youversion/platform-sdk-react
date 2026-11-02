---
'@youversion/platform-core': minor
---

Add paginated `searchImages` for `GET /v1/search-images`. Pass the same query, version id, and `pageSize` on each page, then pass `nextPageToken` back as `pageToken`. An empty page can still include a token. HTTP 204 is an error.

Verse-of-the-day reads use `GET /v1/verse-of-the-days`. Pass `language_ranges` to send `language_ranges[]`. `image_id` is null when the API omits it or sends null.
