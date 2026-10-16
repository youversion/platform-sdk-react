---
'@youversion/platform-react-ui': patch
---

Preserve isolated component host layout when React Suspense hides and reveals
content by applying the protected reset in a layout effect. Shadow hosts also
declare their intended display in server markup so layout is correct before
hydration. Strict CSP policies that reject inline style attributes will block
that pre-hydration declaration and report a violation; hydrated clients still
apply the protected reset.
