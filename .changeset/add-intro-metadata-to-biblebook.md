---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

feat: Add intro metadata to BibleBook

- Added optional `intro` field to BibleBook schema for retrieving book introduction metadata
- The intro field includes `id`, `passage_id`, and `title` properties when available
- Simplified type definitions by removing duplicate type files and using Zod schemas as single source of truth
- Updated Bible mocks and tests to cover the new intro field