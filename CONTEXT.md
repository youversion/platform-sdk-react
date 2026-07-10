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

The default `BibleReader` posture (YPE-1034): the reader fetches and writes
highlights itself through the SDK's own auth session. The color row is
always offered; tapping a color when the user lacks a session or the
highlights permission enters the highlight auth flow (July 9 2026 sync,
superseding the earlier hide-when-signed-out idea).

## Highlights permission

The per-app grant that authorizes highlight reads/writes for a user. It is
**not an OIDC scope**: it travels as `requested_permissions[]=highlights`
alongside `scope` at authorize time (PR #280) and is granted via a data
exchange consent. Permissions are open-ended strings, never enums (more
arrive later, e.g. verse notes). The **server is the source of truth** for
whether it is granted; any client-side permission cache is optimistic only.

## Pending highlight

The user's stashed highlight intent (verses + color + timestamp) while the
highlight auth flow is in flight. Survives a redirect round-trip via
sessionStorage; expires stale (~10 min) so an abandoned round-trip can
never apply a highlight during a later sign-in. Discarded on decline,
cancel, or failure.

## Highlight auth flow

The state machine (see the React Web auth state machine doc) that turns a
color tap into an applied highlight across two user paths: one-fell-swoop
(sign-in requesting the highlights permission together) and just-in-time
(already signed in, permission confirm dialog → data exchange grant).
Cancellation at any point keeps the verse selection intact and discards
only the pending highlight.

## Controlled mode

A planned `BibleReader` posture (YPE-3705): the host application supplies
rendered highlights as data and receives highlight-intent events, and the
reader makes no highlight network calls. The host owns auth, persistence,
and conflict rules. Used by native hosts (RN Expo SDK) embedding the web
reader.

## Verse action popover

The floating action bar (YPE-642) that appears over a verse selection,
offering highlight colors, copy, and share.
