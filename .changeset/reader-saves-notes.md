---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Add Save to the Bible Reader's verse actions. The Notes composer keeps the exact
selection, including gaps, and saves a passage with optional text, privacy, and
highlight color. Reader sign-in requests Notes scopes. The reader refreshes
chapter highlights after a successful save.

`'save'` is now a built-in action ID. TypeScript consumers that enumerate built-in
actions should handle `'save'` alongside `'highlights'`, `'copy'`, and `'share'`.

`NotesClient` supports creating a passage-only note with empty `content`.
