---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

feat(core): make data objects that should be immutable readonly

- changed data types that come from api responses and should not
  be mutated to be readonly.
- See the documentation on these types, https://developers.youversion.com/sdks/react#referenced-types
