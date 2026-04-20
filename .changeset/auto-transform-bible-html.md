---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Auto-transform Bible HTML in `getPassage` — verse wrapping, footnote extraction, sanitization, and table fixes now happen automatically. Consumers no longer need to call `transformBibleHtml` manually. Uses native DOMParser in browser, dynamic `import('linkedom')` on server. Added `data-yv-transformed` idempotency marker so double-transforms are a no-op.
