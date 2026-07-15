---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Route UI component storage access through hardened web-storage helpers so components no-op when localStorage is unavailable (Node >=26 experimental webstorage, SSR). Reads fall back to defaults and writes are skipped. Core now exports `getLocalStorage`/`getSessionStorage`, and the helpers prefer `window` storage over the global accessor so a usable store still wins where the two disagree.
