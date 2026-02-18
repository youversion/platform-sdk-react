---
'@youversion/platform-react-ui': patch
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
---

Refactor verse footnote extraction and rendering for clarity and correctness

- Replace TreeWalker-based footnote extraction with clone-and-transform approach
- Move HTML transformation pipeline into `verse-html-utils.ts` as `transformBibleHtml`
- Fix space insertion between element siblings when footnotes are removed
- Fix footnote marker/label mismatch for verses with >26 footnotes
- Simplify `BibleTextHtml` hooks and use React `onClick` instead of manual event listeners
- Use `useMemo` for synchronous HTML transformation instead of `useEffect` + `useState`
