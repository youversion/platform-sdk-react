---
'@youversion/platform-react-ui': minor
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
---

feat(ui): add dark mode theme support to BibleTextView and BibleReader

- Add theme prop (light/dark) to BibleTextView for text theme control
- Implement theme inheritance from YouVersionProvider via useTheme hook
- Add data-yv-sdk and data-yv-theme attributes for CSS styling
- Pass theme prop from BibleReader to BibleTextView
- Add yv:bg-background wrapper to all BibleTextView Storybook stories
- Rename prop from 'background' to 'theme' for semantic clarity
