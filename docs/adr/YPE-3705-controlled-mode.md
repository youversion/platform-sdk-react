# YPE-3705 — Controlled (headless) BibleReader highlights

Status: **Accepted** (grilling session 2026-07-20, Dustin + Claude)
Component: `packages/ui/src/components/bible-reader.tsx` (+ `packages/ui/src/lib/highlight-projection.ts`)
Epic: YPE-2894 (RN Expo Highlights) · Blocks: YPE-3710, YPE-3711, YPE-3712
Related: PR #288 (highlights UI + state machine + API, open) · PR #269 (verse action popover) · YPE-1034 ADR (on PR #288)

## Context

Native hosts (the RN Expo SDK embedding the web reader as a DOM component) own
highlight data, auth, and persistence natively. The epic's goal is keeping the
**user token** out of the WebView, so the reader must be able to render
highlights and report highlight taps without performing any highlight
persistence of its own. Bible *content* fetching (passage, books, version
metadata) is app-key catalog traffic, not user data, and is unchanged.

## Decisions (ADRs)

### ADR-001 — Presence of `highlights` = controlled mode, latched at first mount

`BibleReader.Root` gains `highlights?: Highlight[]`. Passing it (including
`[]` = "controlled, nothing highlighted") puts the highlight slice in
controlled mode; never passing it keeps the self-contained posture. The mode is
latched at first mount: flipping presence across renders gets a dev-mode
`console.warn` and is unsupported. After mount, a transient `undefined` on a
controlled reader renders as "no highlights" — it never re-enables
self-contained behavior.

### ADR-002 — Prop shape is core's `Highlight[]`, projection is the reader's job

The prop is core's `{ version_id, passage_id, color }` — exactly what
`/v1/highlights` returns — so hosts pipe API/cache data through untouched. The
reader filters by displayed version + chapter, expands range USFMs
(`JHN.3.16-18`), and derives its internal per-verse render map itself
(`packages/ui/src/lib/highlight-projection.ts`). Entries for other versions,
books, or chapters are ignored: every entry carries its full identity, so stale
bridge data can never mispaint. Named `highlights`, **not** `highlightedVerses`
— that name already means the internal `Record<number, string>` render map.

### ADR-003 — Pure projection, no optimistic echo

A color tap paints nothing; the highlight appears only when the host
round-trips an updated `highlights` prop. The native data layer (C2/YPE-3708)
is the only optimistic layer in the system — two optimistic layers would fight
over reconciliation.

### ADR-004 — Intent events out, single serializable payload per event

Three new callbacks on `BibleReader.Root`:

- `onVerseSelect(selection)` — fires in **both** modes on every selection
  change; `verses: []` whenever a non-empty selection clears (deselect,
  after a highlight/copy/share action, popover dismiss, navigation). It is an
  observation.
- `onHighlightApply(intent)` / `onHighlightRemove(intent)` — **controlled mode
  only**; they are requests. In self-contained mode the reader owns the tap
  and these props are ignored (never called). Remove is scoped to the selected
  verses currently showing the tapped color, per the prop-derived map.

Payloads are single serializable objects of bridge-safe primitives (repo
convention, `BibleReaderShareData` precedent). `passageIds` is always
per-verse — range collapsing is an API-layer optimization, not user intent —
and deliberately redundant with `book`/`chapter`/`verses`: native feeds the API
without USFM string-building; analytics reads `verses` without USFM parsing.

### ADR-005 — No persistence, no auth surface in controlled mode

Controlled mode never reads, writes, or migrates the localStorage highlight
store, and (post-#288) never fetches or writes the highlights API. No sign-in
dialog, permission dialog, or redirect can originate from the highlight path.
The prop fully shadows local state, so YPE-1034's localStorage deletion is a
no-op for controlled hosts. `onCopy`/`onShare` are unchanged (already
mode-independent).

### ADR-006 — Controlled mode bypasses the `HIGHLIGHTS_LIVE` dark-launch flag

The flag (a PR #288 concept) strictly means "is the self-contained server path
live." The color row is always interactive in controlled mode. Consequence:
the controlled prop surface is public released API while self-contained stays
dark.

## Rejected alternatives

- **Explicit mode prop** (`mode="controlled"`): a second axis that can
  contradict the data (`mode="controlled"` with no `highlights`, or data with
  `mode="selfContained"`). Presence-of-prop is the established controlled/
  uncontrolled idiom in this codebase and in React generally.
- **Chapter-scoped `Record<number, string>` prop**: pushes filtering, USFM
  parsing, and range expansion onto every host, and loses the identity fields
  that make stale bridge data harmless. It is also a second public meaning for
  the `highlightedVerses` shape/name.
- **Reader-side optimism** (paint on tap, reconcile on prop): two optimistic
  layers (reader + native data layer) with no way to agree on failure
  semantics. The reader cannot know whether a write succeeded; the host can.
- **Machine-level controlled state** (teaching the XState machine a
  `controlled` region): the machine's job is the self-contained auth/write
  flow. Controlled mode wants the machine provably inert, which is an enable
  guard, not a new state chart region (see integration rules below).
- **Stacking on PR #288**: serializes two large changes and blocks the RN epic
  on #288's merge date. Built in parallel on `main` instead; whoever merges
  second pays the (small, documented) re-seat.

## PR #288 integration rules (for whoever merges second)

- The controlled branch moves from `Content` into the `useBibleReaderHighlights`
  adapter: a `controlled` input; when set, the `useHighlights` fetch stays
  `enabled: false`, and the machine's enable guard keeps it in `disabled` (the
  machine never spawns activity — assert this in tests).
- Controlled mode bypasses `isHighlightsLive()` — the flag gates only the
  self-contained path. `highlightsInteractive` is unconditionally `true` in
  controlled mode.
- The render-map derivation reuses/parallels `parseServerColors` (same
  filter-and-project job, prop-fed instead of fetch-fed).
- `CONTEXT.md`: both branches create it; merge the glossaries (entries here are
  written to be word-compatible with #288's).

## Out of scope (deliberate)

- Notes, custom colors, >5 colors (epic Decision 9 — fast-follow).
- Self-contained *notification* events (`onHighlightApplied` etc.) — future,
  differently-named so intent and fact never share a name.
- Controlled passage/books/version content (the reader keeps fetching content).
- Offline/write-queue concerns — native-side (F1/YPE-3717).
