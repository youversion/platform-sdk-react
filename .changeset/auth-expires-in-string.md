---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
---

Sign-in no longer fails when the token endpoint returns `expires_in` as a string. Callback failures are logged in development so a failed exchange is visible in the console.
