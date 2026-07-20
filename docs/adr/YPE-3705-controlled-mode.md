# YPE-3705 — Controlled (headless) BibleReader highlights

Status: **Accepted** (grilling session 2026-07-20, Dustin + Claude)
Component: `packages/ui/src/components/bible-reader.tsx` (+ `packages/ui/src/lib/highlight-projection.ts`)
Epic: YPE-2894 (RN Expo Highlights) · Blocks: YPE-3710, YPE-3711, YPE-3712
Related: PR #288 (highlights UI + state machine + API, open) · PR #269 (verse action popover) · YPE-1034 ADR (on PR #288)

## Context

Native hosts (the RN Expo SDK embedding the web reader as a DOM component) own
highlight data, auth, and persistence natively; the epic's goal is keeping the
**user token** out of the WebView. Bible *content* fetching is app-key catalog
traffic and is unchanged.

The reader therefore has two postures for its highlight slice:
**self-contained** (YPE-1034 — the reader fetches and writes
highlights through the SDK's own auth session) and **controlled** (this ADR —
the host passes `highlights: Highlight[]` into `BibleReader.Root` and receives
intent events; presence of the prop selects the posture, latched at first
mount). The prop/event surface and its edge semantics are documented by the
public types and the tests in `bible-reader-controlled.test.tsx`; this ADR
records only what the code cannot show.

## Coexistence model

Controlled mode performs **no highlight persistence of any kind** — no API
calls, no localStorage, no sign-in/permission dialogs or redirects. The two
postures never mix: a controlled reader's highlight slice is a pure projection
of the prop, and a self-contained reader never calls the intent-event props.
`onVerseSelect` is a mode-independent observation; `onHighlightApply`/
`onHighlightRemove` are controlled-only requests (a self-contained "applied"
notification would be a different event under a different name).

## Non-obvious decisions

- **Pure projection, no optimistic echo.** A color tap paints nothing; the
  highlight appears when the host round-trips an updated prop. The native data
  layer (YPE-3708) is the only optimistic layer — two optimistic layers cannot
  agree on failure semantics, and only the host knows whether a write succeeded.
- **Controlled mode bypasses the `HIGHLIGHTS_LIVE` dark-launch flag** (a
  PR #288 concept). The flag strictly means "is the self-contained server path
  live"; the color row is always interactive in controlled mode. Consequence:
  the controlled prop surface is public released API while self-contained
  stays dark.

## Rejected alternatives

- **Fully headless reader (pure projection for everything)** — would require
  the host to supply passage HTML, books, and version metadata as props,
  tripling the bridge surface for app-key catalog data that isn't user data.
  The pure-presentational layer already exists below (`BibleTextView`); the
  epic's goal is native ownership of *user data and tokens*, so only the
  highlight slice becomes a pure projection while the reader keeps fetching
  content.
- **Explicit mode prop** — a second axis that can contradict the data;
  presence-of-prop is the established controlled/uncontrolled idiom.
- **Chapter-scoped `Record<number, string>` prop** — loses the identity fields
  that make stale bridge data harmless, and overloads the internal
  `highlightedVerses` name.
- **Reader-side optimism** — see above.
- **Machine-level controlled state** — controlled mode wants the machine
  provably inert; that is an enable guard, not a statechart region.
- **Stacking on PR #288** — would gate the RN epic on #288's merge date; built
  in parallel on `main` instead, with the re-seat documented below.

## PR #288 integration rules (for whoever merges second)

- The controlled branch moves from `Content` into the `useBibleReaderHighlights`
  adapter: a `controlled` input; when set, the `useHighlights` fetch stays
  `enabled: false`, and the machine's enable guard keeps it in `disabled` (the
  machine never spawns activity — assert this in tests).
- Controlled mode bypasses `isHighlightsLive()`; `highlightsInteractive` is
  unconditionally `true` in controlled mode.
- The render-map derivation reuses/parallels `parseServerColors` (same
  filter-and-project job, prop-fed instead of fetch-fed).
- `CONTEXT.md` arrives with #288 (its glossary already defines "Controlled
  mode" as planned): graduate that entry to decided and add a "Highlight
  intent" entry (the reader's request that a highlight be applied/removed —
  always intent, never completed fact; intent and fact are deliberately never
  given the same name).

## Out of scope

Notes, custom colors, >5 colors (epic fast-follow); self-contained notification
events; controlled *content* (the reader keeps fetching passages/books/versions);
offline/write-queue concerns (native-side, YPE-3717).
