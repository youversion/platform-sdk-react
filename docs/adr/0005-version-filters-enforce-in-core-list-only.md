# 5. Version filters enforce in core, and only on lists

Date: 2026-08-18

## Status

Accepted

## Context

YPE-4657 ports the Swift SDK's version-filtering configuration to React:
`permittedVersionIds`, `excludedVersionIds` (added in platform-sdk-swift
db0666d7), and `permittedLanguageTags`. The session default is Swift parity,
with deviations named explicitly (this ADR names them).

Swift enforces all three filters in exactly one place: the version-picker
view model (`BibleVersionsViewModel.isPermitted`). Nothing in Swift's core,
repository, or reader layers consults them, so fetching or rendering an
excluded version directly (deep link, hardcoded id) still works.

React's public surface is layered in a way Swift's is not: integrators
build their own pickers on public hooks (`useVersions`, `useLanguages`) and
on core clients (`getVersions`, `getLanguages`). A picker-internal filter
(Swift's mechanical locus) would leave those public layers unfiltered,
which breaks the *intent* of an SDK-wide restriction even while matching
Swift's implementation.

## Decision

**Locus — filter in core.** `BibleClient.getVersions` filters its results
through the filter predicate; `LanguagesClient.getLanguages` drops
languages excluded by `permittedLanguageTags`. Hooks and the UI picker
inherit filtering for free; core-only integrators get it too. This is a
named deviation from Swift's locus, forced by React's public layering; the
observable picker behavior matches Swift.

**Depth — lists only.** Fetching or rendering a version by id is never
blocked: `getVersion`, `getChapter`, etc. and `<BibleReader versionId>`
work regardless of the filters (Swift parity). The filters are "what we
offer," not "what we forbid" — a hard guard would make an integrator's
saved reading position start throwing when config changes.

**Semantics — Swift parity.**

- Exclusion is checked first and wins over permission.
- Permitted version ids and permitted language tags are ANDed.
- `undefined` permitted list = unrestricted; **empty array permits
  nothing**. Kept deliberately so the same input never means different
  things in the two SDKs; documented as a foot-gun.
- `getLanguages` drops tags outside `permittedLanguageTags` and nothing
  else — it is not recomputed from the surviving versions, so a version-id
  filter can leave a language listed. The picker's language list *is*
  additionally a projection of surviving versions, because it lists only
  languages that still have a version.

**Wiring.** Props on `YouVersionProvider` sync into the
`YouVersionPlatformConfiguration` statics (as `signInPromptMessage` does),
mirrored onto UI's bundled core copy. Documented as set-at-init: changing
them mid-session affects future fetches only; already-fetched lists do not
re-filter.

**Guardrails beyond Swift** (cheap, named deviations):

- Dev-only `console.warn` when a component renders a `versionId` the
  filters would hide (Swift instead has fallback-version logic we are not
  porting; React components render the requested version as-is).
- The picker's localStorage recent-versions list is filtered through the
  same predicate at read time; storage itself is not scrubbed, so lifting
  an exclusion restores the recents. Stored recents carry no language tag,
  so with `permittedLanguageTags` active the picker looks the tag up in the
  versions list — recents stay hidden until that lookup lands, and stay
  hidden if it fails. Hiding a recent we cannot yet judge is the right bias
  for a filter.

## Consequences

- Client-side filtering can shrink a requested `page_size` page of
  `getVersions`/`getLanguages` results. `total_size` still reports the
  server's unfiltered total, so a consumer paginating on it over-counts.
- The predicate keys off `id` and `language_tag`, so an active filter adds
  those fields back into a caller's `fields` projection. `page_size: '*'`
  accepts only 1-3 fields, so turning a filter on can push a maximal
  projection past that limit and turn a working call into an API error. A
  visible error beats a silently empty list.
- `useVersions`/`getVersions` consumers see filtered data with no opt-out.
- No fallback-version selection: excluding the default version (3034) and
  rendering `<BibleReader>` bare still renders 3034, with a dev warn.
- Swift's cache-purge behavior (`removeUnpermittedVersions`) has no React
  equivalent and is intentionally not ported; the SDK persists no version
  content client-side.
