---
'@youversion/platform-core': minor
---

Add `NotesClient` to list, get, create, update, and delete a user's notes through the regular `/v1/notes` API.

- `AuthenticationScopes` supports `read_notes` and `write_notes`, including in `useYVAuth` and `YouVersionAuthButton`.
- `ApiClient` adds `patch` for JSON updates and `getWithStatus` for reading the HTTP status and decoded body as an `ApiResponse`.
- The React UI package re-exports `NotesClient`.
