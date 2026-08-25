---
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': patch
---

Data hooks now cache reads with TanStack Query: revisiting previously fetched content (chapters, verses, versions, highlights, and the rest) renders instantly from an in-memory cache and revalidates in the background instead of blanking and refetching. Public hook APIs are unchanged and no new providers or peer installs are required — `@tanstack/react-query` ships as a direct dependency of the hooks package with a private `QueryClient` inside `YouVersionProvider`. Account-scoped queries (highlights) are keyed per user, so one account can never see another account's cached data; the cache is memory-only and never persisted.
