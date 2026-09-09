---
'@youversion/platform-core': patch
---

Core clients are separate tsup entries so an `ApiClient` import can drop `BibleClient` and `LanguagesClient`. Import zod Mini as a namespace so unused classic locale files and unused Mini helpers stay out of named-import graphs. The version string is inlined from `package.json` without embedding the rest of the manifest. Published JS is whitespace-minified; syntax and identifier minify stay off so the `X-YVP-Sdk` stamp remains verifiable. Core does not run tsup's Rollup tree-shake pass, because that pass folds `isPublishBuild` and trips the stamp guard. Core wipes `dist` on build so stale tsup `.d.cts` files cannot publish. Bible version-filter allowlists live in a small state module so narrow imports do not pull auth storage or grants. `YouVersionPlatformConfiguration` still exposes the same statics. Public `theme.css` keeps the `--yv-*` tokens SDK components read.

Input validation still throws classic `ZodError` for schema failures (`instanceof ZodError` from `zod` matches). Internally schemas use zod Mini; Mini `$ZodError` is wrapped at the public client boundary. `page_size="*"` without 1-3 fields still throws the prior `Error` (`page_size="*" requires 1-3 fields to be specified`).
