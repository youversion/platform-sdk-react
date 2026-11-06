# Shared localization migration

The React UI uses existing shared translation keys for equivalent actions, labels, and messages.
Locale JSON files remain owned by the `platform-localization` sync.

## Missing Korean and Czech translations

At the initial locale inventory revision, `f1c55f10e71a0cd3851908bce31e856f50cd2ad7`, both `ko.json` and `cs.json` lack the shared keys below.
These keys fall back to English until approved translations arrive through the localization sync.
The direct migration accepts this fallback rather than retaining React-specific keys.

| Shared key | Previous React key | Affected UI |
| --- | --- | --- |
| `cancel` | `genericCancel` | Highlights permission dialog |
| `close` | `closeAriaLabel` | Popover close control |
| `error` | `errorHeading` | Bible card and missing app key headings |
| `font` | `fontLabel` | Reader font controls |
| `passageUnavailable` | `passageNotFoundError` | Passage unavailable error |
| `search` | `searchPlaceholder` | Chapter picker and Bible search placeholders |
| `searchLanguages` | `languageSearchAriaLabel` | Language search controls |
| `searchVersions` | `versionSearchAriaLabel` | Version search field |
| `selectLanguage` | `selectLanguageAriaLabel` | Language selector control |
| `regional` | `regionalHeading` | Regional language headings |
| `suggested` | `suggestedTab` | Suggested languages tab |
| `bibleApp` | `bibleAppTitle` | Bible App logo title |

The previous `versionSearchAriaLabel` was also missing in Korean and Czech, so version search already used English.
The other eleven replacements newly fall back to English.
This changes text for eleven keys in Korean and ten in Czech, where the previous Bible App title was already English.
The shared `share` key is present in both locales and replaces `shareAriaLabel` without that gap.

The shared wording also changes some translations in other locales.
English language search labels use "Search Languages", and version search uses "Search Versions".
Distinct messages such as "Reader Settings" retain their existing keys.

## Investigation references

The missing entries belong to the shared keys in `platform-localization/sources/common/en.json` and its Korean and Czech translations.
Translation approval and distribution follow [the i18n workflow](./i18n-guidelines.md).
This migration does not establish why those translations are missing upstream.

Run `node scripts/migrate-shared-i18n-keys.mjs` to check for remaining legacy callers and print the current Korean and Czech gaps.
The optional `--write` argument applies the key substitutions to production TypeScript files.

Remaining React-specific strings and their matches in sibling SDKs are listed in the [cross-SDK comparison](./react-string-cross-sdk-comparison.md).
