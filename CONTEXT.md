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
