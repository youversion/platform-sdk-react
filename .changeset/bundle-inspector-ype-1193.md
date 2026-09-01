---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Add bundle size budgets, tree-shaking verification, and tighter npm publish metadata for core and hooks.

- **core** and **hooks** now declare `sideEffects` so bundlers can drop unused exports (`core` preserves CSS via `"**/*.css"`).
- **core** and **hooks** `files` allowlists exclude test files, test fixture directories (`dist/__tests__`, hooks `dist/test`), and config from published tarballs; both also ship `CHANGELOG.md`.
- **ui** `files` allowlist adds `CHANGELOG.md` to published tarballs.
- **ui** `sideEffects` glob is now `"**/*.css"` (aligns with core; webpack already prepends `**/`).
- Root `pnpm size`, `pnpm check:tree-shaking`, and CI `bundle-size` job guard regressions.
