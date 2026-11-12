---
"@youversion/platform-core": patch
"@youversion/platform-react-ui": patch
---

Upgrade `zod` from 4.1.12 to 4.6.7 to resolve GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404), a high-severity memory exhaustion issue when validating oversized collections. Apps that install the SDK no longer get a vulnerable `zod` from its exact pin.
