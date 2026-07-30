---
'@youversion/platform-react-ui': minor
---

Register the Korean, Turkish, and Chinese locale bundles in the i18n resource map so browser-language detection can select them. Previously the synced bundles shipped unreferenced, and those browsers fell back to English. `pnpm check:i18n` now fails when a locale file is not registered.
