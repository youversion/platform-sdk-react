# YPE-4657 — Usable Bible version (version filter)

Status: **Accepted** (grilling session 2026-08-18)
Component: `@youversion/platform-core` (predicate + client refuse) → hooks inherit → UI error path
Epic: YPE-1315 (React-SDK v2)
Sister: Swift `permittedVersionIds` / `excludedVersionIds` / `permittedLanguageTags`
Related: [Swift version picker docs](https://developers.youversion.com/sdks/swift/components)

This ADR records the ticket shape. Public types and tests own the API
once implemented. Glossary: `CONTEXT.md` (**version filter**, **version
refuse**, usable **Bible version**).

## Context

Swift lets an integrator limit which Bible versions the SDK may use.
YPE-4657 adds the same capability to React. David’s bar: as close to
Swift as possible, without making React worse to comply.

Swift’s public docs talk about limiting the **version picker**. Swift’s
reader also drops unusable ids from restore and fallback, then opens the
picker if nothing remains. `BibleTextView` does **not** apply the client
filter; it fetches the host `versionId` and only shows “unavailable” on
server 401.

React has reader, card, text, and VOTD. Text and VOTD have no picker.
Copying Swift’s split would mean two refuse rules. Types cannot close
the hole: filters are runtime lists, every prop is `versionId: number`,
and `Exclude<number, 4212>` is still `number`.

## Decisions

- **Usable-version policy, one refuse.** An unusable id is not a Bible
  version this app may use. Lists, pickers, recents, and content fetches
  all refuse. The host passing `versionId` does not override the filter.
- **Names.** `permittedVersionIds`, `excludedVersionIds`,
  `permittedLanguageTags`. Swift’s words, React’s `Id` (not `IDs`).
  Ticket draft `permittedLanguageIDs` is rejected: `Language.id` is
  already a BCP 47 tag; `BibleVersion.language_tag` is the field.
- **Predicate.** Unset permit list = no restriction. Empty permit list =
  permit nothing. Unset/empty exclude = exclude nothing. Allowlists AND.
  Exclusion wins. Same as Swift.
- **Config path.** Optional `YouVersionProvider` props, written onto
  `YouVersionPlatformConfiguration` (same as `appName` /
  `signInPromptMessage`). No new `configure()`. Core-only hosts set the
  statics. UI provider must mirror onto its bundled core copy. Filters
  must be visible to the first `BibleClient` call after mount.
- **Refuse presentation.** Core throws `Error` with `status: 403` before
  returning scripture (no network when the id alone decides). Hooks pass
  `error` through. UI reuses `VerseUnavailableMessage` /
  `forbiddenError`. No throw from UI, no blank tree, no silent fallback
  to `DEFAULT_LICENSE_FREE_BIBLE_VERSION`. One dev `console.warn` for a
  host-passed unusable id.
- **Language allowlist.** Content methods may `getVersion` once for
  `language_tag`, then refuse or continue. Missing metadata = refuse.
  `getVersion` is itself refused when the id is unusable without the tag.
- **Lists.** Filtered pages must not drop a usable row that lives on a
  later server page of the same query. Recents: hide at read time; do
  not rewrite localStorage.
- **Out of scope for v1.** Branded/`as const` `versionId` generics.
  Swift’s “open the picker when fallbacks fail.”

## Why not Swift’s split

React’s BibleText / VOTD cannot open a picker. A picker-only rule would
also leak scripture through `usePassage` / `BibleClient`. One core
refuse is the smaller surface and matches “this app may not use that
version.”
