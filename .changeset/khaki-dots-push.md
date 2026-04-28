---
"@youversion/platform-core": patch
---

fix(core): decode JWT payload claims as UTF-8 to prevent mojibake in non-ASCII user names.
