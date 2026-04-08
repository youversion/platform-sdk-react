---
"@youversion/platform-react-ui": minor
---

Add i18next internationalization support with one extractable string ("Verse of The Day"). i18next and react-i18next are optional peer dependencies so existing consumers are unaffected. The SDK creates an isolated i18next instance (no global singleton mutation) and falls back to English by default.
