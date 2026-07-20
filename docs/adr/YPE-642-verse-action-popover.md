# YPE-642 — Verse Action Popover (highlights, copy, share)

Status: **In design** (grilling session 2026-06-23)
Component: `packages/ui/src/components/bible-reader.tsx` (+ `verse.tsx`)
Prior art: PR #131 (CLOSED) — salvage, don't rebuild.

## Why #131 stalled

The popover logic was never the problem. It died because the **Bible HTML
structure** couldn't render highlights cleanly (line gaps, footnote color
breaks), and fixing that + getting stakeholder buy-in took a long time. That
structure fix has since landed: verses are wrapped in one-or-more `.yv-v[v="N"]`
elements, so a per-verse background can apply as a solid block. **The blocker is
gone.** #131's `VerseActionPopover` (correct AC logic, tested, already uses Radix
`PopoverAnchor virtualRef`) is salvage-grade.

## Glossary

| Term | Meaning |
|---|---|
| **Selection** | Verses currently tapped. Ephemeral. Drives the popover. Keyed by verse number within the rendered chapter. |
| **Highlight** | A persisted color on a verse. Survives deselection. Modeled like the API `highlight` object. |
| **Active highlights** | Distinct colors present across the current selection → drives the X (remove) buttons. |
| **Apply circle** | Color button that adds a highlight. |
| **Remove circle (X)** | Color button that clears an existing highlight. |
| **Anchor** | DOM element the popover triangle points at — the last-selected verse's `.yv-v` element. |
| **Swatch** | The full-saturation color shown in the circle. |
| **Fill** | The faded (~20-30% alpha) background painted on the verse. |

## Decisions (ADRs)

### ADR-001 — localStorage only this PR
> **Superseded** by [YPE-1034 ADR-001](./YPE-1034-highlights-server-only.md):
> highlights are server-only; the localStorage store is removed.

Highlights persist client-side only. Server sync is a **separate ticket**.
No network, no API client this PR.

### ADR-002 — Local model mirrors the future API `highlight` object
The API shape (from spec) is:
```
highlight {
  bible_id:   int32    // e.g. 3034
  passage_id: string   // verse USFM, e.g. "MAT.1.1"
  color:      string   // /^[0-9a-f]{6}$/ hex, no '#', e.g. "44aa44"
}
```
Local store is shaped the same so the API swap later is mechanical:
- Keyed/scoped by `bible_id` + `passage_id` (full verse USFM).
- `passage_id` derived in-chapter as `${book}.${chapter}.${verseNumber}` from
  BibleReader context.
- In-render, `verse.tsx` still works in verse **numbers**; the persistence layer
  maps number ↔ `passage_id`. The on-wire/on-disk truth is USFM.

### ADR-003 — Salvage #131's popover, don't rewrite
Bring back `verse-action-popover.tsx` + its tests verbatim where possible. It
already implements all 9 ACs and uses Radix `PopoverAnchor virtualRef`. Changes
needed: real YV colors (ADR-005), alpha fill (ADR-005), wire into BibleReader
(ADR-004), real copy/share formatting (open). **Drop** the vestigial
`@oddbird/css-anchor-positioning` polyfill — the popover never used it.

### ADR-004 — BibleReader.Root owns selection + highlights; BibleTextView stays presentational
- Selection state and the highlight map live in `BibleReader.Root` context,
  using the existing `useControllableState` idiom (uncontrolled by default;
  optional controlled `highlights` / `onHighlightsChange`, `onCopy`, `onShare`).
- `BibleTextView` stays dumb: receives `selectedVerses` + `highlightedVerses`
  (color map), emits `onVerseSelect`. It already does exactly this — we change
  the highlight value type from `boolean` to color hex and wire the props that
  `Content` currently omits.
- The popover lives in `Content`, opens when selection is non-empty, anchored
  via `PopoverAnchor virtualRef` to the last-selected `.yv-v` element resolved by
  `querySelector('.yv-v[v="N"]')`.
- **Breaking-ish:** `highlightedVerses` changes `Record<number, boolean>` →
  `Record<number, string>` (hex). It's wired nowhere in the composite today, so
  blast radius is small, but it is a public prop on `BibleTextView`.

### ADR-005 — Hardcoded hex palette, matching the iOS app
Theme tokens don't carry these exact colors (the iOS app hardcodes them), so the
palette is hardcoded here too. Simpler than mapping to tokens.

| Highlight | Hex (stored / API + swatch) |
|---|---|
| yellow | `fffe00` |
| green | `5dff79` |
| blue | `00d6ff` |
| orange | `ffc66f` |
| pink | `ff95ef` |

- Lowercased to satisfy the API `color` pattern `/^[0-9a-f]{6}$/`.
- **Swatch** (circle) = `#<hex>` solid + a `1px #121212 @ 20%` inner stroke
  (applies to all swatches).
- **Fill** (verse) = the hex at **35% opacity** behind the text
  (`rgba(<hex>, 0.35)`, `HIGHLIGHT_FILL_OPACITY` in `verse.tsx`).
- **Active/remove swatch** = the solid color circle with a **24px X icon** in the
  Text/Everdark color (`--yv-gray-50` = `#121212`, theme-invariant) — replaces the
  old stroke-based selected indicator.
- No theme tokens, no dark variant.

### ADR-006 — Copy/Share format = bible.com behavior (supersedes AC3)
AC3's inline `"text" - Book Ch:V Version` is **wrong**. The real format, per
Cam's example, mimics bible.com:
```
<verse text, gaps joined by " ... ">

<Book> <Chapter>:<verses> <VERSION>
```
- Text and reference separated by a blank line (`\n\n`). No dash.
- Non-contiguous verses → ` ... ` between the gap (e.g. selecting v1+v3 of
  Proverbs 19 → `…perverse. ... A person's own folly…`).
- Reference: full book name, `1-3` for contiguous range, `1,3` for
  non-contiguous, `1` for single. Version = abbreviation.
- Verse **numbers and footnote markers must be stripped** from copied text —
  `.yv-v` textContent includes them; clean prose only.
- Share = same string, Web Share `{ text }`, **no URL / deep link**.
- Quote-character style (straight vs curly, single vs double) is OPEN — match
  bible.com exactly.

## Resolved (round 2)
- Palette → theme.css expressive (ADR-005). Copy format → bible.com (ADR-006).
- Share = text only, no deep link. No auth gating. Apply/copy/share + outside
  click all clear selection and close the popover.

## Resolved (round 3)
- **Copy text cleaning:** strip verse numbers + footnote markers; clean prose only.
- **Multi-wrapper verses:** highlight paints every `.yv-v[v="N"]` wrapper; copy
  concatenates them in document order.
- **Per-version:** highlights scoped by `bible_id` (NIV highlight ≠ ESV). Yes.
- **localStorage:** key `yv:highlights:<bible_id>` → `{ "<passage_id>": "<hex>" }`.
  Load on mount + version change; filter to visible chapter for render.
- **Quote char:** curly double `"…"` wrapping the whole text block.
- **No cap.** No cross-chapter highlighting, so selection is bounded by the
  chapter's verse count. Number ↔ passage_id mapping is always sufficient.

### ADR-007 — Selection lifecycle tied to navigation
Changing `book`, `chapter`, or `versionId` clears selection and closes the
popover (those verses no longer exist / highlights reload for the new scope).
Selection is always enabled in BibleReader (no opt-out prop for now; YAGNI).

### ADR-008 — Selection visual = underline; stacks over highlight fill
- Selected (not highlighted): **underline** (bottom border) in the foreground
  color, touching the text bottom (the Notion "underline has an offset" note was
  about fixing this exact thing).
- Highlighted: 25%-alpha color fill (ADR-005).
- Selected **and** highlighted: fill stays, underline drawn on top — reads as
  both. Underline over a color fill is legible; a second bg wouldn't be.
- Tunable; swap to a ring/bg later if Figma says otherwise.

## As-built notes (deviations from the design above)
- **ADR-005 active-swatch icon (YPE-1034 PR3):** the 24px **X** on active/remove
  swatches was replaced with a 24px **checkmark** (`icons/check`), matching iOS
  (platform-sdk-swift #179). Same Text/Everdark (`--yv-gray-50` = `#121212`,
  theme-invariant) fill and identical behavior — tapping still removes the
  highlight; the swatch's `Clear highlight` aria-label is unchanged.
- **ADR-004 revised:** selection + highlights live in `Content`, **not** Root
  context. Copy/Share/anchor all need the rendered verse DOM (which lives in
  Content), so Root ownership would fragment the feature. BibleTextView stays
  presentational. No new Root props — smaller API surface.
- **ADR-005 mechanism:** fill uses `rgba(r,g,b,0.25)` (computed from the stored
  hex in `verse.tsx` `hexToRgba`), not `color-mix`. Same alpha-composite result,
  zero browser-support caveats.
- **Verse-tap vs outside-click:** ADR-007 says outside-click clears selection,
  but Radix treats a *second verse tap* as an outside-click too. The popover's
  `onInteractOutside` calls `preventDefault()` when the target is inside
  `.yv-v[v]`, so tapping more verses re-anchors instead of dismissing. Only a
  true outside tap clears (matches the YV apps).
- **localStorage key:** `youversion-platform:highlights:<versionId>` →
  `{ "<passage_id>": "<hex>" }`.
- **Files:** new `verse-action-popover.tsx` (+ tests, restored from #131),
  `lib/verse-share.ts` (+ tests), `icons/box-stack`, `icons/box-arrow-up`;
  `verse.tsx` (color fill + `getCleanVerseText`), `bible-reader.tsx` (Content
  wiring), `verse.stories.tsx` (VerseSelection story now drives the real
  popover), i18n (en/fr/es), `global.css` (selection underline). The `@oddbird`
  polyfill was never reintroduced — the popover anchors via Radix `virtualRef`.

## Build-time risks (not blocking design, flag for implementation)
- **Footnote color break** (Notion): even post structure-fix, `<sup>`/footnote
  markers inside a verse may interrupt the fill. Verify the fill covers them.
- **Footnote contrast (handled):** on a highlighted verse the footnote marker
  switches from `--yv-gray-20` to `--yv-foreground` (theme-adaptive, AA over all
  5 fills in both themes) via the `isHighlighted` prop on `VerseFootnoteButton`.
- `verse.tsx` uses `useLayoutEffect` (line 283) for the class toggle; AGENTS.md
  (SSR) says prefer `useEffect`. Pre-existing; clean up while here.
- #131 leftovers to handle: replace the old verse-selection Storybook story +
  remove demo highlight CSS; add a changeset.
