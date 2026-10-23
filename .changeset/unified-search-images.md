---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
---

Add image hits to unified search. `searchUnified` and `useUnifiedSearch` accept `fields: ['images']` and return `images` as `{ id, passageId }` entries. Malformed image rows are dropped.
