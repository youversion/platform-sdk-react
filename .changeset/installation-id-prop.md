---
'@youversion/platform-core': patch
---

Tolerate runtimes without `crypto.randomUUID` by falling back to a non-secure timestamp+random installation id.
