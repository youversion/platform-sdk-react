---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Add Bible Reader search: one USFM grammar, an exclusive-lane `useBibleSearch` session, and a Toolbar-mounted `BibleReaderSearch` that navigates with transient verse focus.

Expose `BibleReaderNavigation` for host requests before reader mount, passage or full-chapter display, and optional in-place focus. Search supports grapheme-safe input, deduplicated results, visibility-gated verse text, automatic pagination, and accessible dismissal and errors.
