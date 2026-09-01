---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
---

Bible chapter, verse, version, book, and passage reads now honor the API's Cache-Control remaining lifetime in the in-memory query cache. Reopening a still-fresh chapter does not hit the network; a remount after expiry fetches again. Highlights, the versions list, and verse of the day keep today's freshness. Existing GET callers still receive the body only. This is not a disk cache and does not close the RN Expo persistence ticket.
