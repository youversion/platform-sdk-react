---
'@youversion/platform-react-ui': patch
---

Harden Shadow DOM style isolation so text direction is the only intentionally inherited CSS property and host custom properties cannot alter known SDK spacing or radius values. Document-root font sizing still affects the prototype's rem-based dimensions.
