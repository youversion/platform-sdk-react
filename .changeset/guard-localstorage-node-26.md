---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Guard localStorage access so the SDK works on Node >=26 where the experimental localStorage global exists but is undefined without --localstorage-file. All localStorage/sessionStorage access in core now goes through safe helpers that only use a storage object when it is truthy and actually usable.
