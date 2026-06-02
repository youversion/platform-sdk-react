---
'@youversion/platform-core': minor
---

Sync core schemas/types with the latest OpenAPI spec:

- Add `passage_id` (optional) to `BibleIndexChapter` and `BibleIndexVerse`, and an optional `intro` to `BibleIndexBook` (new `BibleIndexBookIntro` type). `passage_id` is typed optional to stay non-breaking for consumers who construct these objects; it will become required in the next major.
- Relax `BibleVersion.publisher_url` to a plain string (the API may return an empty string).
- Add new public resource types: `Organization`/`OrganizationAddress`, `Video`/`VideoPlaybackSource`/`VideoThumbnail`, `Font`/`FontVariant`/`FontSource`, `License`, and `AppSummary`.
