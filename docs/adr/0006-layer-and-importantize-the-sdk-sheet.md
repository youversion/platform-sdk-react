# 6. Put the SDK sheet in `@layer yv` and mark it `!important`, minus an exemption list

Date: 2026-08-07

## Status

Accepted. This decision extends
[ADR-0005](0005-scope-sdk-css-to-data-yv-sdk-subtrees.md). The
`:is([data-yv-sdk], [data-yv-sdk] *)` gate from that decision is unchanged here.

Amended 2026-08-07 by
[ADR-0008](0008-stop-sdk-css-at-consumer-slots.md), which added a slot exclusion
to the gate's descendant arm. Every gate literal below is the pre-0008 form. The
split into a layered important half and an unlayered normal half is unchanged,
and so is every specificity number below: 0008 puts its exclusion inside
`:where()`, which costs nothing. That placement is a consequence of this
decision. The exempt half is normal, so its rank against consumer CSS is decided
by specificity alone, and a gate that gained 0,1,0 would have moved it up.
ADR-0008 has the measurement that made the call.

## Context

ADR-0005 gated every SDK selector and shipped the sheet in no cascade layer.
That closed every leak the harness measured except one. A consumer rule with
`!important` still reached our components:

```css
button { padding: 2rem !important }        /* reached 155 buttons */
button { border-radius: 0 !important }     /* reached 65 of those 155 */
```

ADR-0005 called this out of contract. `docs/style-isolation-residual-leak.md`
measured 880 leaks and recommended against shadow DOM on that basis.

### What changed: the cascade math was wrong

The residual-leak report said no light-DOM technique corrects an `!important`
leak, because "a consumer `!important` rule still ties and wins on source order,
because their sheet loads after ours". That is true for two *unlayered*
important declarations. It is false once one of them is in a layer.

[CSS Cascade 5 §6.1](https://www.w3.org/TR/css-cascade-5/#cascade-sort) sorts
declarations by origin-and-importance first, then by cascade layer, then by
specificity, then by order of appearance. §6.4.4 states the layer rule:

> Cascade layers … are sorted by order of declaration … **for normal rules**,
> and in **reverse order of declaration** for important rules … declarations
> not in any layer act as if they were in a final anonymous layer.

Read the two together and a consequence falls out that neither ADR-0005 nor the
leak report used:

| Both declarations are | Layer order | Winner |
| --- | --- | --- |
| normal | low to high, unlayered last | the **unlayered** one |
| important | high to low, unlayered last | the **layered** one |

A declaration inside `@layer yv` and marked `!important` therefore beats an
unlayered `!important` consumer rule. Specificity never enters the comparison,
because the layer decides it first. This was checked in a browser on 2026-08-07
before the implementation started, and the integration harness re-checks it in
Chromium on every run.

The same fact closes the high-specificity case for free. Importance is sorted
above specificity, so `#app button { padding: 1rem }` at 1,0,1 loses to a
layered important declaration at 0,2,0.

### Why blanket importantization is still wrong

Three hazards, all in the same specification:

1. **An author `!important` declaration outranks the inline `style` attribute.**
   Radix positions poppers and dialogs with an inline `style`: `position`,
   `left`, `top`, `transform`, `min-width`, `z-index`, `visibility`. An
   important declaration of any of those pins the popover wherever our utility
   class put it.
2. **An important *cascaded* declaration outranks the CSS animation origin.**
   Cascade origin order runs UA normal, user normal, author normal, animations,
   author important. An important `opacity` therefore holds every fade at its
   declared value. The animation still runs; it just has no effect.
3. **`!important` inside a `@keyframes` body is invalid CSS and is ignored.**
   Keyframe bodies must never be touched.

### Why the layer cannot hold the whole sheet

An exempt declaration cannot be important, by definition. A *normal* declaration
inside `@layer yv` loses to ordinary unlayered consumer CSS at any specificity —
which is the exact failure mode ADR-0005 was written to escape.

This is measured, not reasoned. Wrapping the whole sheet in the layer and
importantizing everything except the exemption list ran the harness at
**14 failed, 522 passed**. Every failure came from the `preflight` group and
from exactly four property families: `font-size` (56 leaks), `line-height` (56,
derived from `font-size`), and the four `border-*-width` (16 each). Those are
precisely the exempt properties, demoted below plain Tailwind Preflight by the
layer that was supposed to protect them.

## Decision

### 1. Split every rule by property into two halves

`packages/ui/scripts/scope-selectors.mjs` now emits the sheet twice over:

```css
@layer yv;                                    /* declared first, before @import */
:is([data-yv-sdk],[data-yv-sdk] *).card{position:absolute}          /* exempt, normal */
@layer yv{
  :is([data-yv-sdk],[data-yv-sdk] *).card{color:red!important}      /* the rest */
}
```

- **Unlayered and normal**: every property in `EXEMPT_PROPERTIES`. This is
  exactly the cascade position those declarations had before this change, so no
  exempt property regresses.
- **`@layer yv` and `!important`**: everything else.

The two halves hold disjoint property sets, so they never compete with each
other. The split costs nothing in the SDK's own internal cascade.

The bare `@layer yv;` statement comes first, ahead of the `@import`s. It fixes
the layer's position in the order. Only `@charset` and a bare `@layer` statement
may precede `@import`.

Tailwind's own `@layer properties` block — which it emits for the `@property`
fallback whatever our directives say — is entirely `--tw-*` custom properties,
and custom properties are exempt as a family. The block therefore lands whole in
the unlayered half, with the shape and the cascade position Tailwind shipped. We
do not nest it inside `yv`.

### 2. The exemption list

Every entry is a property that something outside this stylesheet must be able to
set. Nothing is on the list because it feels risky. Two rules keep it honest: a
shorthand is exempt when any of its longhands is exempt, and the build fails
when a `@keyframes` in this sheet animates a property that is not on the list.

| Family | Properties | Who sets it, and what breaks |
| --- | --- | --- |
| 1. Animated by a `@keyframes` in this sheet | `opacity`, `transform`, `height`, `filter` | `tw-animate-css` spin/pulse, the Radix enter/exit set, accordion-down/up. Important, the animation runs with no visible effect |
| 2. Composes with `transform` | `translate`, `scale`, `rotate`, `transform-origin`, `transform-style`, `transform-box`, `perspective`, `perspective-origin`, `backface-visibility`, `will-change` | Importantizing half the transform pipeline while the animated half stays normal gives a transform that is right in neither state |
| 3. Animation and transition controls | all `animation-*` and `animation`; all `transition-*` and `transition` | Radix `Presence` writes `animation-fill-mode` inline to hold an exit frame while it measures. Important, the element unmounts mid-exit |
| 4. Written inline by Radix or floating-ui | `position`, `top`, `right`, `bottom`, `left`, all `inset-*`, `z-index`, `min-width`, `visibility`, `pointer-events` | The Radix Popper wrapper positions poppers and dialogs with an inline `style`. `DismissableLayer` and the Dialog overlay write `pointer-events`. Important, the popover pins to the top-left of the viewport |
| 5. Written inline by an SDK component | `font-size`; `background-color`; all `border-*-width`, `border-*-color`, `border-*-style` | Preflight and `theme.css` compile *into* this sheet and declare these on bare elements. Important, this sheet beats our own components: `font-size` (verse.tsx, bible-reader.tsx, bible-version-picker.tsx), `background-color` and `border` (the highlight swatch in verse-action-popover.tsx), `border-color` and `border-width` (YouVersionAuthButton) |
| Shorthands | `font`, `background`, `border`, `border-top/right/bottom/left`, `border-block*`, `border-inline*`, `all` | Each holds at least one exempt longhand. `border` in particular arrives as Preflight's `border: 0 solid` on every element; important, it erases the highlight swatch's inline border |
| Custom properties | every `--*` name | A consumer `[data-yv-sdk] { --yv-primary: … }` override must keep winning. `ConsumerTokenOverrideStillApplies` asserts it |

An author-written `!important` already in the source keeps whichever half its
property belongs to. `yv:h-6!` in verse-of-the-day.tsx is the only one in the
sheet today; it stays unlayered, exactly where it was.

### 3. Text surgery, not a Lightning CSS visitor

The `!important` pass is a string rewrite of Lightning CSS's *printed* output,
not a `Declaration` visitor. This is forced, not preferred.

**Lightning CSS 1.31.1 cannot round-trip any declaration whose value contains
`var()` through the JS visitor API.** Returning such a node throws
`failed to deserialize; expected an object-like struct named Specifier, found ()`.
Mutating the node in place is silently ignored. `Declaration` and
`DeclarationExit` fail identically. Reproduced with `.a { --x: var(--y) }`,
`.a { color: var(--y) }` and `.a { --tw-shadow: 0 0 #0000; box-shadow:
var(--tw-shadow) }`; `--x: red`, `color: oklch(…)`, `url(…)` and `font-family`
all succeed. Read-only visitors that return `undefined` are unaffected, which is
why the `Selector` gate from ADR-0005 keeps using one.

Safety comes from re-parsing the finished text with Lightning CSS. `verifyOutput`
fails the build on any of:

- a selector without the gate (ADR-0005's check, unchanged);
- a non-exempt declaration that is not `!important`;
- an exempt declaration that is `!important`, unless it was important in the
  source;
- any `!important` inside a `@keyframes` body;
- a `@keyframes` that animates a property missing from the exemption list;
- a structural layer fault: more than one `@layer yv` block, or a block that is
  not last.

A corrupted rewrite does not reach these checks at all — it throws in the
parser. That is how the `@import` bug below was caught.

`scripts/verify-styles.js` adds the shipped-artifact check: `dist/index.js` must
contain `@layer yv{`, must contain the gate, and must not contain
`@layer yv-sdk-`.

## Consequences

- **A consumer `!important` rule no longer reaches our components.** All six
  consumer-CSS groups now report zero leaks on all fifteen components. The
  `important` group went from 944 leaks to 0. The new `highSpecificity` group
  (`#yv-consumer-host-root button { padding: 1.5rem; margin: 1.25rem;
  border-radius: 0 }`) went from 1,570 leaks to 0. Both "before" figures are the
  fifteen-story harness run against the ADR-0005 sheet; the 880 in the old
  residual-leak report was the same `important` group over thirteen stories. The
  run after this change is 43 files, 541 tests, all passed.

- **ADR-0005's shadow-DOM condition is now moot, and the answer is unchanged.**
  That condition was: recommend shadow DOM if the residual includes rules
  *without* `!important`. It never did, and now the `!important` rules are gone
  too. Do not adopt shadow DOM.

- **The migration message to consumers changed.** ADR-0005 told partners that
  `!important` still overrides us. It no longer does.
  `packages/ui/README.md` and the changeset say so. The supported paths are
  unchanged: `--yv-*` tokens, the `theme` and `background` props, or an issue.

- **Two residuals remain, both deliberate.** A consumer rule that is
  `!important` *and* sits in a layer they declared before `yv` still wins — a
  consumer who writes that has opted in. And every exempt property keeps its
  pre-change cascade position, which is the price of a working popover and a
  working animation. `docs/style-isolation-residual-leak.md` has both.

- **`dist/tailwind.css` is 13.7 percent larger raw and 6.1 percent larger
  gzipped**: 112,665 bytes to 128,093, and 13,800 gzipped to 14,639. The cost is
  841 `!important` tokens plus the rules that appear in both halves.

- **Nothing in `packages/core/src/styles/theme.css` changed.** Its declarations
  are compiled into this sheet and are importantized by the same pass, so the
  reset now beats a consumer `!important` too.

- **`--minify` output is the shipped output, and only it is asserted.** The
  pretty-printed path is a dev convenience for `--watch`. Its whitespace is not
  pinned by any test.

- **A reversal is one function.** Delete `splitByImportance`, restore
  `assembleSheet` to a pass-through, and drop the two new checks in
  `verifyOutput`. The `important` and `highSpecificity` harness groups fail
  first, which is why they assert rather than record.
