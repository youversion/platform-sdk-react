---
'@youversion/platform-react-ui': patch
---

Preserve isolated component host layout when React Suspense hides and reveals
content. Shadow hosts now declare their intended display in server markup before
the protected client-side reset is applied.
