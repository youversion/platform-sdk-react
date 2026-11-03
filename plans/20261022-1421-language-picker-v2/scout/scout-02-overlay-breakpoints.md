# Scout 02 — overlay and breakpoints

## Summary

Picker chrome is only the popover card. `Dialog` is a centered small card. No Sheet or Drawer. `max-sm` only shrinks width. `onVersionPickerPress` is the host escape hatch. `Content` `open` / `onRequestClose` is the host-owned wrapper path.

## Popover

`/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/popover.tsx`

- Radix Popover. Portal. No overlay.
- Classes: `w-sm`, `sm:max-w-sm`, `max-sm:max-w-[calc(100vw-2rem)]`, `max-h-[66svh]`, `rounded-2xl`, `shadow-lg`.
- Floating UI sets position inline. `collisionPadding={16}`. Side slide animations. Transform origin `--radix-popover-content-transform-origin`.
- Header grid grows columns for `headerLeading` and `headerChild`.
- `PopoverClose` + `XIcon` always render when `showHeader` is true. No prop to hide Close alone.
- `theme` → `data-yv-theme`. `dir` from `useInterfaceDirection`.
- Shared. Also used by reader settings and verse actions in `bible-reader.tsx`. New props must default to today's card.

## Dialog

`/Users/cameron/Code/localization/platform-sdk-react/packages/ui/src/components/ui/dialog.tsx`

- Radix Dialog. Has overlay `fixed inset-0 bg-black/50`.
- Content is centered: `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`, `max-w-sm`, `rounded-2xl`, `p-6`.
- Do not restyle this for the picker. Sign-in and highlight dialogs use the centered card.

## Why CSS-only full-bleed is the risky first try

A `max-sm:fixed max-sm:inset-0` class fights Floating UI `top` / `left` / `transform`. Popover also has no overlay, and Q2 wants overlay-tap dismiss on mobile. Click-outside already closes a popover, but there is no dimmed layer.

## Breakpoint contract

- `max-sm` (under 640px): full viewport. Square corners. Own overlay. Scroll inside the sheet.
- `sm+`: current card. ~24rem wide. `66svh`. Anchored popover. Versions keep Close. Language views do not.

## Host path must stay a body

When the host passes `onVersionPickerPress` and renders `Content` / `BibleLanguagePickerContent` itself, this SDK must not wrap that body in a second popover or sheet. The host owns the shell. Sheet/card switching applies only to the SDK popover branch (`open` and `onRequestClose` both absent).

## Primitives rule

`packages/ui/AGENTS.md`: `src/components/ui/` primitives are internal except `Separator` and `Textarea`. A new Sheet stays unexported from `src/index.ts` / `components/index.ts`.
