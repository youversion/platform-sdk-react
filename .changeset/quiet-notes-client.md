---
'@youversion/platform-core': minor
---

Add `NotesClient` to list, get, create, update, and delete a user's notes through the regular `/v1/notes` API.

- Notes checks app version filters for supplied list version IDs and write passage references. Malformed response passages are omitted while preserving the note and pagination.
- `AuthenticationScopes` supports `read_notes` and `write_notes`, including in `useYVAuth` and `YouVersionAuthButton`.
- `ApiClient` adds `patch` for JSON updates and `getWithStatus` for reading the HTTP status and decoded body as an `ApiResponse`.
- The React UI package re-exports `NotesClient`.
