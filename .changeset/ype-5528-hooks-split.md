---
'@youversion/platform-react-hooks': patch
---

Hooks import `YouVersionContext` from its module, not the context barrel, so a `useChapter` import does not evaluate Auth. Hooks run tsup's Rollup tree-shake pass so unused exports drop from narrow graphs. Hooks wipe `dist` on build so stale tsup `.d.cts` files cannot publish.
