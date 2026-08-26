---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Restore SDK box and type styles when a host ships unlayered `button {}` / Tailwind preflight. One unlayered `revert-layer` rule on `[data-yv-sdk]` descendants rolls those properties back to `yv-sdk-*`. This is light-DOM isolation (A2), not Shadow DOM.
