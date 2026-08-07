# 8. Stop SDK CSS at consumer slots

Date: 2026-08-07

## Status

Accepted. This decision changes the gate from
[ADR-0005](0005-scope-sdk-css-to-data-yv-sdk-subtrees.md). The layered-important
split of [ADR-0006](0006-layer-and-importantize-the-sdk-sheet.md) and the
rem-to-px conversion of [ADR-0007](0007-convert-rem-to-px-in-the-sdk-sheet.md)
are both unchanged.

## Context

ADR-0005 gated every SDK selector on `[data-yv-sdk]`:

```css
:is([data-yv-sdk], [data-yv-sdk] *).yv\:mt-4 { margin-top: 16px }
```

The gate reads "the SDK rendered this subtree". That claim is false for one kind
of element. An SDK component that accepts `children`, or a render prop, renders
the consumer's own markup inside its own stamped root. The second arm of the
gate, `[data-yv-sdk] *`, matched all of it.

`packages/core/src/styles/theme.css` made the same claim. Its descendant block
declares `font: inherit`, `color: inherit`, `box-sizing`, `margin`, `padding`
and `border` on every descendant of a stamped root. That block was resetting the
consumer's own markup.

ADR-0006 made this worse. Everything outside the exemption list moved into
`@layer yv` and became `!important`. So the SDK was not only restyling consumer
content, it was doing so with declarations the consumer could not override from
an ordinary sheet.

Nobody had measured this direction.

### Measurement

The forward direction asks whether consumer CSS moves SDK DOM, and it answers by
removing the consumer sheet. The reverse direction cannot answer by removing the
SDK sheet. That would also remove every SDK value that consumer content
legitimately **inherits**, and inheritance is not a leak: content placed
anywhere in a page inherits from its ancestors.

So the baseline is a placement, not a sheet state. The harness renders the same
consumer markup twice in one document, with the SDK sheet present for both:

- `outside`: in the page, with no `[data-yv-sdk]` ancestor.
- `inside`: in an SDK component's consumer slot.

A difference between the two is SDK CSS matching consumer DOM, and nothing else.
The fixture declares all 32 tracked properties on every element it renders, so
inheritance is not part of the comparison.

Before the change:

| Placement | Leaks |
| --- | --- |
| `BibleReader.Root` children | 255 |
| `BibleChapterPicker.Trigger` children | 68 |
| `BibleVersionPicker.Trigger` children | 68 |

The 255 covers 21 elements: `box-sizing`, `color`, `font-family`, all four
margins and all four paddings on every one of them, plus `background-color`,
`border-radius`, `font-size`, `line-height`, `border-top-width`, `font-weight`,
`list-style-type` and `text-indent` where the reset names a specific element.

## Decision

Add a slot boundary. An element stamped `data-yv-slot`, and everything under it,
is consumer territory. No SDK selector matches it.

The gate's descendant arm becomes:

```css
:is([data-yv-sdk], [data-yv-sdk] *:not([data-yv-slot], [data-yv-slot] *))
```

Three parts ship together.

1. `packages/ui/scripts/scope-selectors.mjs` emits the new arm.
2. `packages/core/src/styles/theme.css` writes the same `:not()` by hand on
   every descendant selector. The script skips those selectors, because they
   carry the gate already.
3. `packages/ui/src/lib/consumer-slot.tsx` exports `ConsumerSlot`, a
   `<span data-yv-slot style="display: contents">`. `display: contents`
   generates no box, so stamping a slot never changes layout.

The `dark` custom variant in `packages/ui/src/styles/global.css` carries the
gate itself and is also hand-written. It needs the exclusion for a second
reason, below.

### Specificity

`:is()` and `:not()` each take the specificity of their most specific argument.
The new arm holds one attribute selector plus a `:not()` holding one attribute
selector, so the gate adds 0,2,0 where it used to add 0,1,0.

The rise is uniform. Every gated rule gains the same 0,1,0, so no rule in the
sheet changes rank against another rule in the sheet.

One selector had to move with it by hand. The `dark` variant compiles to
`:is([data-yv-sdk][data-yv-theme='dark'] *)` and the script does not rewrite it.
Left alone it would have stayed at 0,3,0 while every base utility rose to 0,3,0,
tying dark mode with light mode and letting source order decide. With the
exclusion it is 0,4,0 and keeps its old one-step margin.

## Consequences

### The slot boundary works

After the change, the same three placements read **zero**. All seven
consumer-CSS groups on all fifteen components still read zero, and every
pre-existing assertion still passes.

### The boundary stops selectors, not inheritance

Consumer content in a slot still inherits `color`, `font-family`, `font-size`
and the rest from its SDK ancestors. That is ordinary CSS, and it is what
happens to the same markup anywhere else in a page. A consumer who wants
different values declares them, and now nothing of ours overrides the
declaration.

### Content that is not in a slot is restyled harder than before

This is the cost, and it is measured. The same 0,1,0 rise that keeps the sheet
internally consistent also lifts the SDK's **normal** declarations — the ones on
`EXEMPT_PROPERTIES`, which stay unlayered — above a consumer rule at 0,1,0.

The harness has a positive control that renders the same fixture with no slot.
It went from 255 leaks to 416. The new properties are `font-size`,
`font-style`, `font-weight` and the four `border-*-width` longhands, all of which
`theme.css` sets through `font: inherit` and `border: 0 solid`, and all of which
are exempt and therefore normal.

The fix for a consumer hitting this is to stamp a slot. `ConsumerSlot` does it
for the sites listed below; a consumer can put `data-yv-slot` on their own
wrapper anywhere else.

### Three sites cannot be stamped

`asChild` merges our props onto the consumer's own element. There is no element
left to wrap, and wrapping one changes the rendered DOM shape, which is the
whole point of `asChild`.

| Site | Why |
| --- | --- |
| `BibleReader.Root` children | One stamped `div` holds both SDK compound children (`Toolbar`, `Content`) and consumer children. A slot around all of them would switch off the styling the SDK children need. |
| `BibleChapterPicker.Trigger` with `asChild` | `cloneElement` and the Radix `asChild` path both target the consumer's own element. |
| `BibleVersionPicker.Trigger` with `asChild` | Same. |

A consumer can close all three by wrapping their own content in an element with
`data-yv-slot`. The harness story `BibleReaderConsumerSlot` does exactly that,
and reads zero.

### One residual selector shape remains

The build check reads `data-yv-sdk` where it appears literally in a compound. It
does not fire for a Tailwind variant whose subject sits past the gate compound,
such as `.yv\:space-y-4 > :not(:last-child)`. Those can still reach the slot
wrapper element the SDK renders. They cannot reach the consumer's elements below
it, because a child combinator does not go that deep.
[docs/style-isolation-residual-leak.md](../style-isolation-residual-leak.md)
records it.

## Alternatives considered

**`:where(:not(…))` instead of `:not(…)`.** `:where()` contributes no
specificity, so the gate would have stayed at 0,1,0 and unslotted consumer
content would not have been restyled harder. It was not taken, because the
uniform 0,2,0 also strengthens the forward direction the SDK is graded on, and
because a boundary that is invisible to specificity is harder to reason about
when reading a compiled selector. The trade is recorded here so it can be
revisited with the 416 number in hand.

**Shadow DOM.** Rejected in ADR-0005 for reasons that have not changed. It also
does not help here: consumer `children` passed into a shadow root through a slot
are styled by the shadow sheet's `::slotted()` rules, which is the same problem
with different syntax.

**Documenting the behavior instead of fixing it.** "Your markup is ours once you
pass it to us" is not a defensible contract for a component library.
