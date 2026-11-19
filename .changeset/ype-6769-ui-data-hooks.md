---
'@youversion/platform-react-ui': minor
'@youversion/platform-react-hooks': minor
---

Re-export supported data hooks and their public types from `@youversion/platform-react-ui`, including `usePassage` and `useVersions`. Apps using styled components can import data hooks from the same package and use them beneath its `YouVersionProvider`, without adding the hooks package as a direct dependency. The independent `@youversion/platform-react-hooks` package remains available for headless apps. Both packages now export the shared `UseApiDataOptions` type.
