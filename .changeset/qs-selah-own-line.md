---
'@youversion/platform-core': patch
'@youversion/platform-react-ui': patch
---

Render a Selah pause on its own italic line, aligned to the end. A pause inside a refrain stays on that line.

Transformed HTML now wraps that pause in a `div.yv-qs-line`, and a host paragraph can split into two elements around it. Trailing punctuation and an attached footnote marker move into `.qs` with the pause.
