---
'@youversion/platform-react-ui': patch
---

Split the UI JavaScript build so named package-root imports can drop unused UI. Keep core as a runtime dependency so UI and hooks share one copy, and re-export core values from UI by name instead of `export *`.

The package root remains the only public entry. Provider embeds only the chrome CSS needed for its missing-app-key panel. Components that need the utility or Bible reader sheets inject those styles from separate internal modules. The public stylesheet and CDN publisher both use the complete exported sheet. Consumer-shaped size, runtime-export, and tree-shaking checks guard the split for both ESM and CommonJS builds.
