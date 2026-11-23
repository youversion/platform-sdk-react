---
'@youversion/platform-core': minor
---

Add Content Library video detail, playlists, dedicated video search, and ID-only video hits in unified search. The new video APIs use `ContentLibraryVideo` with opaque string IDs and `passage_id`. Existing `Video`, unified field selections, and hook overrides remain compatible with v3.

Video details and playlists use beta during rollout. Unified search uses beta only when `videos` is explicitly selected; existing selections remain on stable.

Infer the legacy `Video` type from its own schema while retaining numeric IDs and optional Bible references.
