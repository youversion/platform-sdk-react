---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Fix one-shot highlight sign-in so a color tap does not re-prompt after OAuth.

- Align authorize wire format with Swift: `requested_permissions=highlights` (comma-joined).
- Stash `granted_permissions` across the `/auth/callback` hop and also seed the permission cache from the token `scope` (OIDC scopes filtered), matching Swift.
- Accept `appName` / `signInPromptMessage` on `YouVersionProvider` and mirror them onto the UI package's bundled core singleton (tsup `noExternal`), so integrators are not bitten by dual module copies.
- Sign-in dialog uses the YouVersion Platform wordmark (Swift parity); vite-react demo sets the highlights pitch via provider props.
