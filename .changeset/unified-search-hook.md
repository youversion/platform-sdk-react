---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': minor
---

Add useUnifiedSearch for loading top verse references, related topics, and image hits through the unified-search core client, without changing the existing paginated Bible search flow.

Validate unified-search request intents and required response fields against the API contract, while accepting responses without images and preserving unknown response intent strings. Image selection requires backend support.
