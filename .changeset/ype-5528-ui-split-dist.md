---
'@youversion/platform-react-ui': patch
---

Split the UI JavaScript build so a `YouVersionProvider`-only import can drop `BibleReader`, `BibleChapterPicker`, and `BibleVersionPicker`.

The package root is still the only public entry. The three Bible components are separate files in `dist`. Partners who import only the provider no longer evaluate those modules.
