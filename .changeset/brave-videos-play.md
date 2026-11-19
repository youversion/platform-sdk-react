---
'@youversion/platform-core': major
---

Add Content Library video detail, playlist, unified video-hit, and dedicated video-search APIs. Video identifiers are now opaque strings and video records use the deployed `passage_id` contract, which is a breaking correction to the existing public `Video` type. Unified search responses also add a required `videos` array, so typed fixtures and hook overrides must include it.
