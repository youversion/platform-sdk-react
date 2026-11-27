---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Add Save to the Bible Reader's verse actions. The Notes composer keeps the exact
selection, including gaps, and saves a passage with optional text, privacy, and
highlight color. Reader sign-in requests Notes scopes. The reader refreshes
chapter highlights after a successful save.

The configurable verse actions include the built-in IDs `'highlights'`, `'save'`,
`'copy'`, and `'share'`. Include `'save'` in a custom action order to offer Notes.

`NotesClient` supports creating a passage-only note with empty `content`.

- Hooks exports `useCreateNote` and `useUpdateNote`, which take an explicit access
  token for the write. The Reader recovers lost create responses with the same
  request ID and reconciles subsequent edits against the recovered note.
- Core adds `YouVersionAPIUsers.isSignInPending` and `onTokenRotation`, plus
  `YouVersionPlatformConfiguration.getOAuthAccessToken`,
  `hasMismatchedOAuthSession`, and `didStoredAccountChange` for OAuth lifecycle
  and account-bound credential checks. `signIn` accepts a pre-redirect callback,
  `refreshTokenIfNeeded` accepts a rotation observer, and `saveAuthData` accepts
  optional scope/account metadata. Reader sign-in scope overrides are supported
  by `useHighlightAuthActions().startSignInForHighlights`. `AuthContextValue`
  exposes verified-token, account-revision, callback-state and auth-ownership
  fields for managed auth consumers.
- In SDK-managed auth, `useYVAuth().auth.accessToken` can be `null` even while
  `isAuthenticated` remains true. Sessions created by version 3.0.0 have no new
  account/scope binding and are treated as legacy. A normal token refresh in
  another tab invalidates the receiving tab's legacy token verification; its
  fetched highlights disappear until that tab reloads, remounts its auth provider,
  or signs in again. Same-instance SDK refreshes retain legacy verification.
- Managed `useHighlights` reads are disabled, with data masked to `null`, until
  both the account and its verified access token are available. Host-controlled
  auth and highlights retain their existing behavior.
