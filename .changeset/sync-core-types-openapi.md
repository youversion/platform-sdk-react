---
'@youversion/platform-core': minor
---

Sync core schemas/types with the latest OpenAPI spec:

- Add missing `passage_id` to `BibleIndexChapter` and `BibleIndexVerse`, and an optional `intro` to `BibleIndexBook` (new `BibleIndexBookIntro` type).
- Relax `BibleVersion.publisher_url` to a plain string (the API may return an empty string).
- Add new public resource types: `Organization`/`OrganizationAddress`, `Video`/`VideoPlaybackSource`/`VideoThumbnail`, `Font`/`FontVariant`/`FontSource`, `License`, and `AppSummary`.
