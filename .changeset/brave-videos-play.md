---
'@youversion/platform-core': minor
---

Add Content Library video detail, playlists, dedicated video search, and ID-only video hits in unified search. The new video APIs use `ContentLibraryVideo` with opaque string IDs and passage/publisher metadata. Existing `Video`, unified field selections, and hook overrides remain compatible with v3.

Video details, playlists, and dedicated video search use beta during rollout. Unified search uses beta only when `videos` is explicitly selected; existing selections remain on stable.

Unified search results now include an enumerable `videos` array, including `[]` when no videos are returned. JSON output, exact snapshots, and `keyof SearchUnifiedResponse` gain this key; existing hook overrides may still omit it. Video field selection is available through core `SearchClient`; the existing React hook retains its verse/topic/image selections. Shared hook options should use `SearchUnifiedOptions` or `UseUnifiedSearchProps` rather than derive the wider selection from the core method signature.

An empty `organizationIds` array now searches without publisher filters, matching an omitted option. Search-only bundles exclude playlist validation code. Dedicated video search can return empty pages with continuation tokens; continue until `nextPageToken` is null, rather than stopping on an empty video array. The response has no total result count.

Preserve optional nullable `passage_ids`, `organization_id`, and `references` on video details and dedicated-search resources, alongside earlier beta `passage_id` responses. Thumbnail URL strings may be absolute, relative, or protocol-relative.

Video queries use the shared 100-grapheme limit. Missing or null `user_intent` and `search_instead_for` fields are tolerated. Video search deliberately rejects HTTP 204 as an undocumented response, unlike Swift and Kotlin, which return an empty page.

The new `VideosClient` consistently uses camelCase options: `acceptLanguage`, `pageSize`, `pageToken`, and `thumbnailSize`. Null video-search and playlist input cursors mean the first page, as when omitted; empty string cursors remain unchanged. Playlist requests default to English for YPE-6461 while honoring explicit language preferences.
