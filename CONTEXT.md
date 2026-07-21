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
highlights itself through the SDK's own auth session. Highlight behavior is
gated on the internal `HIGHLIGHTS_LIVE` dark-launch flag and an
authenticated user — while the flag is off or the user has no session, the
reader is inert: no fetches, no writes, nothing rendered from the API.

## Controlled mode

The alternate `BibleReader` posture (YPE-3705): the host owns highlight
data, auth, and persistence (e.g. a React Native / Expo DOM host keeping
the user token out of the WebView). The host passes `highlights:
Highlight[]` into `BibleReader.Root` and receives highlight intents; the
reader is a pure projection — no API calls, no local persistence, no
sign-in surface. Presence of the prop selects the posture (latched at
first mount). Controlled mode bypasses `HIGHLIGHTS_LIVE`: the color row
is always interactive so the public prop surface can ship while
self-contained stays dark.

## Highlight intent

The reader's request that a highlight be applied or removed
(`onHighlightApply` / `onHighlightRemove`). Always an intent, never a
completed fact — intent and fact are deliberately never given the same
name. In controlled mode the highlight appears only when the host
round-trips an updated `highlights` prop.

## Verse action popover

The floating action bar (YPE-642) that appears over a verse selection,
offering highlight colors, copy, and share.
