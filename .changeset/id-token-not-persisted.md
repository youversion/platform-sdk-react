---
"@youversion/platform-core": major
"@youversion/platform-react-hooks": major
"@youversion/platform-react-ui": major
---

Stop persisting the ID token. The ID token is now decoded once at sign-in to
derive the user profile and then discarded — only the decoded profile is
persisted (validated with Zod on read), so it survives reloads without keeping
the signed token in `localStorage`. The stored profile is cleared on sign-out
and when a session expires and cannot be refreshed.

**Breaking changes:**

- `AuthenticationState.idToken` has been removed. Components that read
  `auth.idToken` from `useYVAuth()` should no longer rely on it; use `userInfo`
  for profile data.
- `YouVersionPlatformConfiguration.saveAuthData(accessToken, refreshToken, expiryDate)`
  no longer accepts an `idToken` argument.
- `YouVersionPlatformConfiguration.idToken` getter has been removed. The decoded
  profile is available via `YouVersionPlatformConfiguration.storedUserInfo` (or
  `YouVersionAPIUsers.getStoredUserInfo()`).
- `YouVersionAPIUsers.refreshTokens()` no longer requires a stored ID token.
