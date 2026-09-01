# Ubiquitous Language

Glossary of domain terms for the YouVersion Platform SDK. Terms here are
canonical: code, docs, and conversation should use them exactly.

## Highlight

A user-owned color marking on a Bible passage, stored on the user's
YouVersion account. Highlights are **account data, not device data**: they
require an authenticated user and are never persisted locally by the SDK
(decided in YPE-1034, superseding the temporary localStorage store from
YPE-642 / ADR-001).

Identified by the pair (**Bible version**, **passage**). A highlight has
exactly one **color**.

## Passage

A verse or contiguous verse range in one chapter of one Bible version,
identified by a USFM string (`JHN.3.16`, `JHN.3.16-18`). A chapter USFM
(`JHN.3`) is a passage *scope* used for querying, not a highlightable unit.

## Bible version

A translation/edition of the Bible, identified by a numeric id. The SDK
calls this `version_id`; the highlights wire API calls the same value
`bible_id`. The SDK name is canonical in public types; mapping happens at
the API boundary only.

A Bible version is **usable** for an app only when it satisfies the
integrator **version filter**. An unusable id is not a Bible version this
app may use: lists omit it, pickers omit it, restored recents omit it, and
content fetches refuse it. The host passing `versionId` does not override
the filter.

## Version filter

Integrator policy (YPE-4657) for which Bible versions this app may use,
set on `YouVersionProvider` and stored on
`YouVersionPlatformConfiguration` (same path as `appName` /
`signInPromptMessage`). Three optional lists, Swift names, React `Id`
spelling:

- `permittedVersionIds` — allowlist of Bible version ids
- `excludedVersionIds` — denylist of Bible version ids
- `permittedLanguageTags` — allowlist of BCP 47 tags (`en`, `zh-Hans`).
  This is `BibleVersion.language_tag` / `Language.id`, not a numeric id.
  _Avoid_: `permittedLanguageIDs`, `permittedLanguageIds` (ticket draft;
  Swift and this SDK both say tags)

Unset (`undefined`) on a permit list means no restriction on that
dimension. An empty permit list (`[]`) permits nothing. Unset or empty
`excludedVersionIds` excludes nothing.

A version is usable when: it is not in `excludedVersionIds`, and (if
`permittedVersionIds` is set) its id is in that list, and (if
`permittedLanguageTags` is set) its `language_tag` is in that list. The
two allowlists combine with AND. Exclusion wins if an id is in both
permit and exclude lists.

`versionId: number` stays a number. Types cannot enforce the filter
(runtime lists; `Exclude<number, 4212>` is still `number`).

## Version refuse

What the SDK does with an unusable Bible version (YPE-4657). One rule
for every surface (reader, card, text, VOTD) and for core/hooks.

Core throws before returning scripture (and before the network when the
id alone decides). The error carries `status: 403` so existing UI maps
it to `forbiddenError` ("This app isn't allowed to access this Bible
content."). Hooks surface that `error`. UI does not throw, does not
render an empty tree, does not swap in another version. Dev: one
`console.warn` for a host-passed unusable `versionId`.

Language-only allowlists need `language_tag`. Content methods may fetch
version metadata once; if metadata is missing, refuse (fail closed).
`getVersion` itself is refused when the id is already unusable without
the tag.

Filtered `getVersions` / `getLanguages` pages must not hide a usable
row that exists on a later server page of the same query. Picker recents
are hidden at read time; localStorage is not rewritten, so lifting the
filter restores them.

_Avoid_: picker-only policy (hide in the chooser, still render
`versionId`); silent fallback to `DEFAULT_LICENSE_FREE_BIBLE_VERSION`;
opening the picker as the refuse (text/VOTD have none).

## Color

A highlight's fill, a 6-character lowercase hex string without `#`
(`fff9b1`). Uppercase input is accepted and normalized at the API boundary.

## Verse selection

The ephemeral set of verses the reader has tapped in `BibleReader`. Drives
the verse action popover. Never persisted; cleared on navigation.

## Self-contained mode

The SDK-owned highlights posture (YPE-1034): the component fetches highlights
itself through the SDK's own auth session.

On `BibleReader` this also includes writes (color row, auth flow). Highlight
behavior is gated on the internal `HIGHLIGHTS_LIVE` dark-launch flag and an
authenticated user — while the flag is off or the user has no session, the
reader is inert: no fetches, no writes, nothing rendered from the API.

On `BibleTextView`, `BibleCard`, and `VerseOfTheDay` (paint only, no
create/delete UI) omit the `highlights` prop for the self-contained default:
when the user is signed in, has granted the **highlights permission**, and
highlights are live, matching verses are fetched and painted. React Native /
Expo DOM hosts that keep the token out of the WebView must not omit the prop;
they pass `[]` or rows so the WebView never fetches.

## Controlled mode

The host-owned highlights posture (YPE-3705): the host passes `highlights:
Highlight[]` and the SDK is a pure projection — no API calls, no local
persistence. Presence of the prop (including `[]`) selects the posture
(latched at first mount). Used by `BibleReader.Root`, `BibleTextView`,
`BibleCard`, and `VerseOfTheDay`. Omitting the prop is self-contained, not
"never paint".

On `BibleReader.Root` the host also receives highlight intents and
controlled mode bypasses `HIGHLIGHTS_LIVE`: the color row stays
interactive so the public prop surface can ship while self-contained
stays dark. `BibleTextView`, `BibleCard`, and `VerseOfTheDay` paint from
the prop only in this posture; they have no intent surface.

## Highlight intent

The reader's request that a highlight be applied or removed
(`onHighlightApply` / `onHighlightRemove`). Always an intent, never a
completed fact — intent and fact are deliberately never given the same
name. In controlled mode the highlight appears only when the host
round-trips an updated `highlights` prop.

## Verse action popover

The floating action bar (YPE-642) that appears over a verse selection,
offering highlight colors, copy, and share.

## Highlights permission

The data-exchange permission (`highlights`) an app must hold before it can
read or write a user's highlights. Permissions are open-ended strings, not
enums — more arrive later — and the server reports the ones a user granted
back to the app via `granted_permissions` on the sign-in and data-exchange
callbacks (YPE-1034).

## Sign-in prompt message

Optional integrator-owned pitch line shown on the **sign-in dialog**
(`YouVersionPlatformConfiguration.signInPromptMessage`). Hidden when unset;
the SDK does not ship a default (Swift parity). Distinct from localized SDK
copy (`signIn.paragraph`, buttons, etc.).
_Avoid_: app message, integrator message (informal); `signIn.appMessage`
(unused Swift stub key)

## Highlight auth flow

The flow (YPE-1034) that turns a color tap into an applied highlight when the
reader is not yet authorized. A tap forks: authorized writes optimistically;
signed out opens the sign-in dialog; signed in without the **highlights
permission** opens the just-in-time permission dialog. Consent routes through
a full-page data-exchange redirect and resumes on return.

## Pending highlight

A user's stashed highlight intent (verses, color, scope) held in
`sessionStorage` while the **highlight auth flow** is in flight (YPE-1034). It
survives the full-page redirect round-trip and expires (~10 min) so an
abandoned round-trip can never silently apply a highlight during a much later
sign-in. It is intent, not highlight data (highlights stay server-only,
ADR-001); discarded on decline, cancel, failure, or successful apply.

## Opted-in Bible read

An opted-in Bible read is a GET under `/v1/bibles/{id}` that honors Cache-Control remaining lifetime.

The list is version, book, books, chapter, chapters, verse, verses, and passage.

Highlights, GET `/v1/bibles` versions list, VOTD, languages, organizations, theme, and auth stay out.

The how and where live in `docs/bible-read-cache.md`.
ADR 0006 is the why.
This is not YPE-5262.

## Remaining lifetime

Remaining lifetime is `max-age` minus `Age`, in milliseconds, on CachePolicy as `remainingMs`.

Missing max-age is 7 days.
Missing Age is 0.
`no-cache` / `no-store` set remainingMs 0.

## CachePolicy

CachePolicy is the parsed Cache-Control result from `parseCachePolicy`.

Fields include `remainingMs` and `allowsCaching`.

## getWithPolicy

getWithPolicy is the `ApiClient` GET that returns `{ data, policy }`.

`ApiClient.get` stays body-only.

## Memory-only

Memory-only means QueryClient lives in process memory.
One QueryClient per YouVersionProvider.

Expo DOM WebViews do not share this memory.

Do not use this layer as the React Native Expo disk cache.
Do not persist QueryClient.
Do not share one QueryClient across Expo WebViews.
Do not wrap window.fetch in the Web SDK to close YPE-5262.

## Remount

A remount is a new hook mount after the previous observer unmounted, under the same YouVersionProvider.

## Still-mounted observer

A still-mounted observer is a hook that stayed mounted after remaining lifetime ended.
