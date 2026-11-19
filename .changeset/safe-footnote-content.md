---
"@youversion/platform-core": patch
"@youversion/platform-react-ui": patch
---

Sanitized `data-verse-footnote-content` found in Bible HTML input with the same allowlist as passage markup, so planted footnote markup can no longer run script in the Bible reader. `transformBibleHtml` now removes input `data-footnote-key` attributes and `data-yv-*` attributes other than `data-yv-transformed`, and drops all SVG and MathML content. `FootnoteContentProps` now documents that `notes` and `verseHtml` must be sanitized HTML.
