---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Add app-wide version filters (Swift SDK parity) — new `YouVersionProvider` props `permittedVersionIds`, `excludedVersionIds`, and `permittedLanguageTags` restrict which Bible versions the SDK offers. Exclusion is checked first and beats permission, the two allowlists are ANDed, an unset prop is unrestricted, and an **empty array permits nothing**. Enforcement is list-only: `BibleClient.getVersions`, `LanguagesClient.getLanguages`, `useVersions`, `useLanguages`, and the version picker (including its recently-used versions) return filtered results, while fetching or rendering a version by id is never blocked — components render a filtered-out `versionId` and log a development-only warning once per id, so deep links and saved reading positions survive a config change. Core also exports the `isVersionPermitted` predicate and the three matching `YouVersionPlatformConfiguration` statics for non-React consumers. The props are set-at-init: changing them affects future fetches only.
