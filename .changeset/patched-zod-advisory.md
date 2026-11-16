---
"@youversion/platform-core": patch
"@youversion/platform-react-ui": patch
---

Update `zod` to 4.6.7. This clears security scanner warnings about zod 4.1.12 ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)). The SDK only checks data that comes from the YouVersion API, from your app, or from its own saved settings, so we don't expect any app to be affected in practice. No code changes are needed.
