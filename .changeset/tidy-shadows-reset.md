---
'@youversion/platform-react-ui': patch
---

Keep text direction as the only intentionally inherited CSS property across an
automatic Shadow DOM boundary. Ambient host custom properties cannot alter SDK
spacing or radius values, while document-root font sizing still affects rem-based
dimensions.
