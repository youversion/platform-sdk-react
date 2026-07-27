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

The `BibleReader` posture (YPE-1034): the reader fetches and writes
highlights itself through the SDK's own auth session. Gated on the host's
**highlights opt-in** (`enableHighlights`) plus an auth-enabled provider,
and the fetch additionally on an authenticated user — without the opt-in,
or with no auth provider, the reader is inert: no swatch row, no fetches,
no writes, no consent dialogs, nothing rendered from the API.

## Highlights opt-in

The host's explicit request for self-contained highlights: the
`enableHighlights` prop on `BibleReader.Root`, default `false`. It is the
single gate on the self-contained path — the SDK holds no second switch of
its own (it replaced an internal dark-launch flag, now deleted). Ignored in
**controlled mode**, where passing `highlights` is itself the opt-in.
_Avoid_: highlights flag, dark-launch flag (gone); `highlightsEnabled`
(the internal verse-action-popover prop, which means "the color row is
visible" and is also true in controlled mode)

## Controlled mode

The alternate `BibleReader` posture (YPE-3705): the host owns highlight
data, auth, and persistence (e.g. a React Native / Expo DOM host keeping
the user token out of the WebView). The host passes `highlights:
Highlight[]` into `BibleReader.Root` and receives highlight intents; the
reader is a pure projection — no API calls, no local persistence, no
sign-in surface. Presence of the prop selects the posture (latched at
first mount). Controlled mode bypasses the **highlights opt-in**: the
color row is always interactive, and `enableHighlights` is ignored.

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
