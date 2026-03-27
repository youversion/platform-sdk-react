---
'@youversion/platform-react-hooks': patch
'@youversion/platform-core': patch
'@youversion/platform-react-ui': patch
---

Fixed hooks package bundling to produce proper CJS and ESM outputs, resolving import failures in strict ESM runtimes like Deno.
