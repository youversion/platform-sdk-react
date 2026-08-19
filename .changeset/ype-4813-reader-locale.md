---
'@youversion/platform-react-ui': minor
---

Hosts can pass `locale` on `YouVersionProvider` to set SDK UI language and `Accept-Language`, and `defaultLanguageId` / `languageId` on `BibleReader.Root` to seed the version picker. App locale and Bible language stay separate: `locale` does not pick a default Bible translation.
