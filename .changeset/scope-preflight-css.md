---
'@youversion/platform-react-ui': patch
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
---

Fix Tailwind preflight CSS leaking globally into consumer apps. The unscoped `@import 'tailwindcss/preflight.css'` was resetting styles on all elements (h1–h6 font size/weight, margins, padding, list styles, etc.) across the entire page. Preflight resets are now scoped to `[data-yv-sdk]` so they only apply inside SDK components.
