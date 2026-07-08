---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Wire the Highlights API into the Bible reader, replacing the localStorage-only highlight store.

- `BibleReader` now loads and saves verse highlights via the Highlights API for signed-in readers (chapter-scoped `GET`, optimistic `create`/`delete`), with the server as the source of truth. The previous `localStorage` persistence (`youversion-platform:highlights:<versionId>`) is removed.
- The reader's sign-in (and the example navbar button) now request the `highlights` data-exchange permission so the token is granted highlights access.
- `@youversion/platform-react-hooks` now exports `YouVersionAuthContext`, enabling null-safe reads of signed-in state without `useYVAuth()` throwing when no auth provider is mounted.

When not signed in, highlighting is currently ephemeral session state (not persisted); the dedicated not-signed-in / permission flow is a follow-up.
