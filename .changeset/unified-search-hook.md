---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': minor
---

Add useUnifiedSearch for loading top verse references and related topics through the unified-search core client, without changing the existing paginated Bible search flow.

Validate unified-search request intents and required response fields against the API contract while preserving unknown response intent strings.
