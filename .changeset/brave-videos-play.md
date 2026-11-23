---
'@youversion/platform-core': minor
---

Add Content Library video detail, playlists, dedicated video search, and ID-only video hits in unified search. The new video APIs use `ContentLibraryVideo` with opaque string IDs and `passage_id`. Existing `Video`, unified field selections, and hook overrides remain compatible with v3.

Video details and playlists use beta during rollout. Unified search uses beta only when `videos` is explicitly selected; existing selections remain on stable.

Unified search results now include an enumerable `videos` array, including `[]` when no videos are returned. JSON output, exact snapshots, and `keyof SearchUnifiedResponse` gain this key; existing hook overrides may still omit it. Video field selection is available through core `SearchClient`; the existing React hook retains its verse/topic/image selections. Shared hook options should use `SearchUnifiedOptions` or `UseUnifiedSearchProps` rather than derive the wider selection from the core method signature.

An empty `organizationIds` array now searches without publisher filters, matching an omitted option. Search-only bundles exclude playlist validation code.
