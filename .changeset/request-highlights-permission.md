---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Allow requesting YouVersion data-exchange permissions (e.g. `highlights`) at sign-in. These are intentionally not OIDC scopes: they ride alongside the standard `scope` param as repeatable `requested_permissions[]` query params on the authorize URL and are authorized via a separate per-app ACL rather than the token's scope claim.

- `YouVersionAPIUsers.signIn(redirectURL, scopes?, permissions?)` and the underlying PKCE authorization request builder now accept a `permissions` array typed as `SignInWithYouVersionPermissionValues[]`.
- `useYVAuth().signIn({ permissions })` forwards them from React.
- `<YouVersionAuthButton permissions={['highlights']} />` requests them from the sign-in button.

Scopes and permissions are separate arguments; existing calls that only pass scopes are unaffected.
