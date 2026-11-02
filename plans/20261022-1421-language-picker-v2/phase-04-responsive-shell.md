# Phase 04 — Responsive shell

## Context Links

- [plan.md](plan.md)
- [research/researcher-01-figma-changelog.md](research/researcher-01-figma-changelog.md) item 7
- [scout/scout-02-overlay-breakpoints.md](scout/scout-02-overlay-breakpoints.md)
- [reports/synthesis.md](reports/synthesis.md)
- [packages/ui/AGENTS.md](../../packages/ui/AGENTS.md)

## Overview

`sm+` stays the anchored card (~24rem, 66svh). Under `max-sm`, the SDK picker becomes a full-viewport sheet. Hosts that pass `open` / `onRequestClose` are unchanged.

Ship as PR2. Fold into PR1 only after the phase 01 folder split, and only if review size is still sane.

## Key Insights

- Card size is already correct at `sm+`. Do not redesign it.
- `max-sm` today only sets `max-w-[calc(100vw-2rem)]`.
- Popover is shared with reader settings and verse actions. Defaults must keep the card and the X.
- Radix Popover positions with inline `top` / `left` / `transform` and has no overlay. A Tailwind `fixed inset-0` often loses.
- Q2 needs overlay-tap dismiss on mobile. Dialog already has an overlay. `dialog.tsx` itself must stay a centered card.
- Sheet, if added, is internal. Do not export it.

## Requirements

- Breakpoint: `max-sm` sheet, `sm+` card. Use Tailwind `max-sm:` / `sm:`. No JS `matchMedia` unless the CSS path is abandoned for a real Dialog mount.
- Sheet: full viewport (`inset-0`, `h-dvh`, `w-screen`, `max-w-none`, `max-h-none`, `rounded-none`). List scrolls inside. Header stays visible.
- Card: `w-sm`, `max-h-[66svh]`, picker `h-[66svh]`, `rounded-2xl`. Same as today.
- Overlay on the sheet. Tap overlay closes. Card keeps current outside-click close. No extra dim layer required on the card.
- Versions sheet: Close button remains (Q2 card Close, and a sheet X is the non-overlay exit).
- Languages and Search Languages: no header X at either width. Back is the exit. Overlay tap still closes the whole picker on mobile.
- Escape closes at both widths.
- `data-yv-theme` and `dir` still on the shell.
- Host body path: no sheet and no popover wrapped around `Content` when `onRequestClose` or `open` is set.

## Architecture

**Try this first (KISS):** `PopoverContent` props

```
sizeVariant?: 'card' | 'sheet'   // default 'card'
showClose?: boolean              // default true (added in phase 01)
```

Picker passes `sizeVariant="sheet"`. Implementation is CSS:

- default / `card`: existing classes
- `sheet`: under `max-sm`, fixed full viewport; at `sm+` the card classes win
- sheet-only overlay sibling, `max-sm:block sm:hidden`, click closes

**Stop and switch** if either is true after a manual check at a narrow viewport:

1. The panel stays anchored to the trigger (Floating UI inline style wins).
2. Overlay-tap cannot close without breaking other popovers.

**Fallback:** `packages/ui/src/components/ui/sheet.tsx` built on `@radix-ui/react-dialog` (copy the overlay pattern, not `DialogContent`'s centered card). Picker shell:

- `sm+`: current `Popover`
- `max-sm`: `Sheet`

Use `matchMedia('(max-width: 639px)')` only in this fallback, one listener, so we do not mount Popover and Dialog at once. Internal file. Not in `components/index.ts`.

Do not edit `dialog.tsx`.

## Related Code Files

- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/popover.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/dialog.tsx` (read only)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-version-picker/index.tsx`
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/bible-reader.tsx` (confirm settings popover stays a card)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/verse-action-popover.tsx` (same)
- `/Users/cameron/Code/localization/platform-sdk-react/packages/ui/AGENTS.md`

## Implementation Steps

1. Add `sizeVariant` default `card` on `PopoverContent`. Picker opts into `sheet`.
2. Add sheet classes and a `max-sm` overlay that calls the popover close. Confirm other popovers omit the prop and look unchanged.
3. Open the vite example (`examples/vite-react`, env from repo root) at a narrow width and at `sm+`.
4. If the panel is not full-bleed or overlay tap does nothing, delete the CSS attempt's special cases (keep `showClose`) and add `ui/sheet.tsx`. Branch the picker shell on `max-sm`.
5. Re-check Versions Close, language views without Close, Back, Escape, overlay tap, and the host `onVersionPickerPress` path (no SDK shell).
6. Story for the sheet lives in phase 06. Add it here if this phase lands alone.

## Todo

- [ ] `sm+` card unchanged (24rem / 66svh)
- [ ] `max-sm` full viewport, scroll inside, header fixed
- [ ] Overlay tap closes on mobile
- [ ] Language views have no X; Versions still has X
- [ ] Other popovers unchanged
- [ ] Host `open` / `onRequestClose` path has no extra shell
- [ ] Sheet not exported if the fallback is used
- [ ] PR notes which path shipped

## Success Criteria

- At ≥640px the picker is the same card as before this phase.
- At &lt;640px the picker covers the viewport. Overlay tap and Escape close it. Back still navigates views.
- Reader settings popover is still a card with Close at both widths.
- Sign-in dialog is still a centered card.

## Risk

- CSS sheet looks full-screen in a screenshot but ignores the trigger anchor and clips. The manual viewport check is the exit test, not a unit test.
- Mounting Dialog and Popover together doubles focus traps. Fallback mounts one.
- `100vw` includes scrollbar. Prefer `100%` / `inset-0` on a `fixed` layer.
- Safe area: add `padding-bottom: env(safe-area-inset-bottom)` on the sheet header/footer only if the vite example shows the search or Close under the home indicator. Do not add it speculatively on the card.

## Security

Modal focus trap must keep Escape and overlay dismiss. Do not set `modal={false}` on a full-screen layer. No new permissions.

## Next Steps

[phase-05-i18n-and-localization.md](phase-05-i18n-and-localization.md) can run parallel to PR1. [phase-06-tests-stories-changeset.md](phase-06-tests-stories-changeset.md) covers the sheet story.
