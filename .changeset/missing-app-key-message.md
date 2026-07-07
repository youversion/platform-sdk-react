---
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Surface a clear error when `YouVersionProvider` is given a missing or empty `appKey` instead of rendering a blank page. The UI provider now renders a styled "Missing app key" message, and the hooks provider throws a descriptive error for hooks-only consumers.
