---
"@youversion/platform-core": major
"@youversion/platform-react-hooks": major
"@youversion/platform-react-ui": major
---

Stop persisting the ID token and harden the auth flow against stale/exposed state.

The ID token is now decoded once at sign-in to derive the user profile and then
discarded — only the decoded profile is persisted (validated with Zod on read),
so it survives reloads without keeping the signed token in `localStorage`. The
stored profile is cleared on sign-out and when a session expires and cannot be
refreshed.

Additional hardening:

- The raw ID token is no longer attached to the sign-in result. It is decoded
  transiently at sign-in to derive the profile and then discarded, so callback
  consumers can no longer read it from memory.
- `YouVersionAPIUsers.getStoredUserInfo()` now returns `null` when the persisted
  profile has no `id`, so a tampered or empty stored profile cannot present as a
  signed-in user with an empty profile.
- `YouVersionAPIUsers.handleAuthCallback()` now clears persisted tokens and the
  stored profile if an error is thrown after they were written, so a failed
  callback cannot leave the user looking authenticated.

**Breaking changes:**

- `AuthenticationState.idToken` has been removed. Components that read
  `auth.idToken` from `useYVAuth()` should no longer rely on it; use `userInfo`
  for profile data.
- `SignInWithYouVersionResult.idToken` has been removed. The result returned by
  `handleAuthCallback()` (and `processCallback()` in `useYVAuth`) no longer
  exposes the ID token; use `userInfo`/`yvpUserId` for profile data.
- `YouVersionPlatformConfiguration.saveAuthData(accessToken, refreshToken, expiryDate)`
  no longer accepts an `idToken` argument.
- `YouVersionPlatformConfiguration.idToken` getter has been removed. The decoded
  profile is available via `YouVersionPlatformConfiguration.storedUserInfo` (or
  `YouVersionAPIUsers.getStoredUserInfo()`).
- `YouVersionAPIUsers.refreshTokens()` no longer requires a stored ID token.
