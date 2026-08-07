# 5. Scope SDK CSS to `[data-yv-sdk]` subtrees instead of cascade layers

Date: 2026-08-06

## Status

Accepted. This decision replaces the cascade-layer strategy from `bcfb868`
(v1.20.0).

Amended 2026-08-07 by
[ADR-0006](0006-layer-and-importantize-the-sdk-sheet.md). The
`:is([data-yv-sdk], [data-yv-sdk] *)` gate below is unchanged and still carries
the outbound guarantee. Two statements below are superseded: the sheet is no
longer in no layer, and a consumer `!important` rule no longer reaches our
components. ADR-0006 has the cascade math and the property exemption list. The
sections marked **Superseded** name what changed.

Amended again 2026-08-07 by
[ADR-0008](0008-stop-sdk-css-at-consumer-slots.md). The gate's descendant arm is
now `[data-yv-sdk] *:where(:not([data-yv-slot], [data-yv-slot] *))`, so SDK CSS
stops at consumer content the SDK only passed through. The gate still adds
0,1,0: the exclusion sits inside `:where()`, which contributes nothing, so every
specificity claim below still holds. Every literal gate string below is the
pre-0008 form. Read it as an outline of the mechanism, not as the shipped
selector.

## Context

A partner puts `BibleTextView` into their app. Their `button { padding: 1rem }`
changes the shape of our version picker trigger. Their
`body { font-family: Comic Sans }` changes our verse text. The partner sees a
broken Bible experience and has no supported way to correct it. Ticket YPE-4113
covers this problem.

### This decision changed three times before

| Date | Commit | Version | Position |
| --- | --- | --- | --- |
| 2026-01-09 | `8e3a672` | 0.10.1 | Added `scripts/strip-layers.js`. SDK CSS in no layer. |
| 2026-01-13 | `694325f` | 1.6.2 | "Opt out of CSS layers." Deleted `strip-layers.js`. |
| 2026-03-09 | `bcfb868` | 1.20.0 | Used layers again, written into `global.css` source. |

Only the changelog records the last change. This ADR exists to prevent a fourth
change by accident.

### Why cascade layers cannot work

`global.css:33` declared nine layers and put every SDK rule into a `yv-sdk-*`
layer. CSS Cascade 5 [§6.1](https://www.w3.org/TR/css-cascade-5/#cascade-sort)
states two facts. A declaration that is in no layer joins an implicit final
layer. The browser compares layer order **before** specificity.
[MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) says it plainly:
"Styles that are not defined in a layer always override styles declared in named
and anonymous layers."

A consumer `button {}` rule in no layer, at 0,0,1, thus overrides every `yv:`
utility at any specificity. This was not a fault in the layer setup. The layer
setup worked as designed. `bcfb868` chose layers on purpose, to stop SDK styles
from overriding consumer CSS. The same choice guaranteed the leak in the other
direction.

### Two channels for a leak, not one

| Channel | Example | Why it overrides the SDK rule |
| --- | --- | --- |
| Direct match | `button { padding: 1rem }` matches our button | CSS in no layer overrides layered CSS at any specificity |
| Inheritance | `body { color: green }` flows into our text | The SDK declares no `color`, so the value is inherited |

The second channel is independent of the cascade. An inherited value applies
where the element declares nothing. Specificity and layer order do not change
this. Only a declaration changes it.

## Decision

### 1. SDK CSS in no layer, with a `[data-yv-sdk]` gate on every selector

> **Superseded in part by ADR-0006.** The gate stands. "In no layer" now holds
> only for the exempt half of the sheet. Everything else ships in `@layer yv`
> and is `!important`. The reasoning below — that a layered *normal* declaration
> loses to unlayered consumer CSS — is correct, and it is why ADR-0006 splits
> the sheet by property instead of layering all of it.

Do not protect the consumer with cascade order. Protect the consumer with the
DOM subtree.

```css
/* before */
.yv\:mt-4 { margin-top: 1rem }

/* after */
:is([data-yv-sdk], [data-yv-sdk] *).yv\:mt-4 { margin-top: 1rem }
```

`:is()` takes the specificity of its most specific argument, so the gate adds
exactly 0,1,0. The compound form matches the marked root and its descendants in
one selector.

This corrects both directions at the same time:

- **Outbound.** SDK CSS cannot match DOM that the SDK did not render. This is a
  structural guarantee, not a bet on cascade order. It is stronger than the
  protection that layers gave the consumer.
- **Inbound.** Inside an SDK subtree, every SDK rule is at 0,1,0 or more. It thus
  overrides a consumer element selector at 0,0,1 and a universal selector at
  0,0,0.

The rewrite runs after the Tailwind build, in
`packages/ui/scripts/scope-selectors.mjs`. Tailwind v4 has no equivalent
function. `prefix(yv)` only renames classes. `@import "tailwindcss" important`
takes no selector argument. The v3 option `important: '#app'` has no v4
replacement. Adam Wathan says that a selector around the import works "mostly by
coincidence"
([discussion #13779](https://github.com/tailwindlabs/tailwindcss/discussions/13779)).
It also breaks: after the nesting is flattened it emits `[data-yv-sdk] :root`,
which can never match.

The script uses Lightning CSS, not a regular expression and not
`postcss-prefix-selector`. Its `Selector` visitor is a typed structural API, so
it cannot corrupt an escaped class name such as `.yv\:mt-4`. `@keyframes`,
`@font-face` and `@property` produce no `Selector` nodes, so the script skips
them by construction. The script also flattens CSS nesting. Flattening is
necessary because `bible-reader.css` and `@utility touch-hitbox` emit nested `&`
rules, which a simple prefixer corrupts. We tested `postcss-prefix-selector@2.1.1`
against the real output of this repo and rejected it. It rewrites `:host` into
`[data-yv-sdk] :host`, which can never match, and thus removes every theme
variable without a warning.

`:root` and `:host` keep no gate. Those rules declare only `--yv-*` custom
properties. They render nothing and cannot collide.

The script parses its own output again and fails the build on any selector
without a gate. That check is the guarantee, not a comment and not a string
match. `scripts/verify-styles.js` adds two more checks. `dist/index.js` must
contain `:is([data-yv-sdk],[data-yv-sdk] *)`, and it must not contain
`@layer yv-sdk-`. The second check names the `yv-sdk-` prefix on purpose.
Tailwind emits `@layer properties` by itself for the `@property` fallback,
whatever our directives say.

### 2. Declare the inherited properties, and close the holes that the gate cannot reach

The gate increases specificity. It does nothing about a property that the SDK
never declares. Three changes to `packages/core/src/styles/theme.css` close that
class of hole:

1. **Remove the `:where()`.** The reset block was `:where([data-yv-sdk])` at
   0,0,0, which a bare `button {}` overrides. It is now `[data-yv-sdk]`.
2. **Declare the inherited set on the SDK root**: `font-family`, `color`,
   `letter-spacing`, `word-spacing`, `text-align`, `text-transform`,
   `text-indent`, `white-space`, `text-shadow`, `font-variant`. Every element
   with `data-yv-sdk` declares the full set again, so portalled surfaces that
   inherit directly from `document.body` are covered too. `direction` is not in
   the set: `bible-reader.css` controls RTL, and `text-align: start` follows the
   direction.
3. **Add `color: inherit` to the descendant block, and the box model to the
   root.** The harness found these two, not the plan. `color` on the root stops
   `body { color: … }`, because that value arrives only by inheritance. It does
   nothing about `ul { color: #f0f }`, which matches an SDK element directly. The
   descendant block is `[data-yv-sdk] *`, which does not match the marked
   element. A consumer `* { box-sizing: content-box }` rule does match it.

We considered `revert-layer` and rejected it. CSS Cascade 5 §7 returns a property
to the layer below, or to the previous origin when no layer is below. For an
inherited property the UA origin declares nothing. The returned value is thus the
inherited value, which is the consumer `body` rule. `revert-layer` removes rules
that target our elements. It does not stop inherited values.

### 3. `@scope` rejected, without a test

`@scope` limits the rules written inside it. It does not block inbound styles.
[MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) is explicit:
"while `@scope` allows you to isolate the application of selectors to specific DOM
subtrees, it does not completely isolate the applied styles to within those
subtrees. This is most noticeable with inheritance. Properties that are inherited
by children (for example `color` or `font-family`) will still be inherited,
beyond any set scope limit."

[CSS Cascade 6 §2.5.3](https://www.w3.org/TR/css-cascade-6/#scope-nesting)
limits only the selectors in the block. A stylesheet elsewhere in the document
can still match elements inside a scoped subtree. Scope proximity is a cascade
criterion below specificity, so it cannot decide a comparison that the gate does
not decide already.

`@scope` gives what `:is([data-yv-sdk], [data-yv-sdk] *)` gives already, without
the specificity. It also adds a dependency with Baseline status "newly available"
(December 2025). There is nothing to test.

### 4. Shadow DOM not adopted. The condition, fixed before the numbers existed

> **Still not adopted, and the condition is now moot.** ADR-0006 closed the
> `!important` residual as well, so there is no measured residual of either
> kind. The costs table below is unchanged and still applies.

**If the residual leak includes rules that do not use `!important`, recommend
shadow DOM. If it does not, do not recommend shadow DOM.**

A consumer who writes `!important` against our elements makes an explicit choice.
We treat that choice as out of contract. The design discussion recorded this
condition before the harness produced one number. The recommendation thus cannot
be adjusted to fit the answer.

**Measured result: 100 percent of the residual uses `!important`.**
`docs/style-isolation-residual-leak.md` has the numbers. Four of the five consumer CSS
groups report zero leaks on all thirteen consumer-host stories. The remaining
leaks come from two consumer declarations. Both use `!important` and both target
`button`: 880 leaks on 155 buttons in 8 components. No rule without `!important`
gets through.

The condition is not met. We do not adopt shadow DOM.

Shadow DOM has these costs, all found during the research:

| Cost | Evidence |
| --- | --- |
| Radix portals mount to `document.body`, outside the shadow root | `popover.tsx:43`, `dialog.tsx:28`. No `container` prop anywhere in the repo |
| Radix `FocusScope` breaks at the boundary. `document.activeElement` returns the host | [radix-ui/primitives#3353](https://github.com/radix-ui/primitives/issues/3353), open |
| `aria-hidden` hides open dropdown content from the accessibility tree | [radix-ui/primitives#1772](https://github.com/radix-ui/primitives/issues/1772), open |
| Dismissable-layer outside-click reads `event.target` as the host | [radix-ui/primitives#2433](https://github.com/radix-ui/primitives/pull/2433), open, "Needs Investigation" |
| Font and color values still cross the boundary by inheritance | [MDN, "Using shadow DOM"](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM). Top-level shadow elements inherit from the host |
| React 19 `<style precedence>` hoisting inside a shadow root is undocumented | No React document covers it. `facebook/react#21728` is a type change only |
| Tailwind v4 does not target shadow DOM | Tailwind Labs, [discussion #15556](https://github.com/tailwindlabs/tailwindcss/discussions/15556): "Shadow dom has other issues around `@property` which we rely on in v4" |
| Layer order is per encapsulation context | CSS Cascade 5 [§6.4.3](https://www.w3.org/TR/css-cascade-5/#layer-ordering) |
| Theming moves per root | Tokens are declared on `[data-yv-sdk]` and stamped again per portal today |

Compare the third row with the fifth. Shadow DOM does not close the inheritance
channel either. It blocks selector matching, not inheritance, so `theme.css`
still needs every declaration in decision 2.

### 5. No consumer opt-out

`YouVersionProvider` has no `styleIsolation` prop. Customization is `--yv-*`
design tokens plus component props, which is what YPE-4113 decided.

An opt-out returns the ambiguity that this ADR closes. It also doubles the
surface we test and keeps the leaky path available forever. `<YvStyles />` and
`<YvFonts />` have no opt-out either. ADR-0004 records the same choice for the
same reason. We can add a prop later without a breaking change, if a real partner
reports a real break.

## Consequences

- **Every exported component now renders as designed under consumer global CSS.**
  Thirteen consumer-host stories in
  `packages/ui/src/components/style-isolation.stories.tsx` measure 32 computed
  properties on every element of the subtree. They fail CI if the leak returns.

- **This is a breaking change, and it ships as a major version.** Token overrides
  continue to work. A consumer `[data-yv-sdk] { --yv-primary: … }` rule has the
  same 0,1,0 specificity as our token block and wins on source order.
  `ConsumerTokenOverrideStillApplies` asserts this. What breaks is consumer CSS
  that overrides an SDK *declaration*. We never supported it, but it has worked
  since `bcfb868`, and someone depends on it.

- **`dist/tailwind.css` is 15.7 percent larger raw and 3.2 percent larger
  gzipped**: 97,402 bytes to 112,665, and 13,369 gzipped to 13,800. The gate is
  one 33-character string in 462 places, so gzip removes almost all of it.
  Selector count, `@property` count and `@keyframes` count are the same before
  and after, so no rule was lost.

- **The build chain has one more step.** `build:css` now writes
  `.cache/tailwind.raw.css`, and `build:css:scope` rewrites that file into
  `dist/tailwind.css`. Tailwind output without the gate never reaches `dist/`,
  which is what we publish. `dev` and `storybook` run the scope script with
  `--watch`, next to the Tailwind watcher.

- **A component without `data-yv-sdk` now loses all of its styling.** The
  attribute changed from a scoping convenience into a requirement.
  `packages/ui/src/components/scope-attribute.test.tsx` renders every export and
  fails on a missing attribute. It also fails on an export that it does not list,
  so a new component cannot pass unnoticed.

- **Every stamp must name a theme, and the theme must be the theme of the
  enclosing scope.** `theme.css` declares the light tokens on the bare
  `[data-yv-sdk]` selector, with dark as a nested override. An element that gets
  `data-yv-sdk` inside a dark scope declares the light tokens on itself again and
  returns to light.

- **`ui/button.tsx` has no stamp, on purpose.** `Button` has no local theme in
  scope. `useTheme()` returns the provider theme, and `BibleReader.Root` resolves
  its own theme from `background`. An audit of all 31 call sites is a separate
  change. `Button` is safe without a stamp. It is not exported, and it always
  sits inside a stamped ancestor, which the descendant arm of the gate covers.

- **Specificity inside the SDK increased uniformly.** All 642 utility rules
  gained the same 0,1,0, so the relative order among utilities is unchanged.
  Hand-written rules in `global.css` and `bible-reader.css` did move relative to
  the utilities. The integration suite is the only check on that, and it covers
  computed properties rather than visual fidelity.

- ~~**A consumer `!important` rule still reaches our components.**~~ True when
  this ADR was written, and closed by
  [ADR-0006](0006-layer-and-importantize-the-sdk-sheet.md) on 2026-08-07. The
  measurement that made the case is in this repo's history;
  `docs/style-isolation-residual-leak.md` now records the two residuals that
  remain.

- **A reversal is not a small change.** To restore layers, restore three things:
  the `@layer` declaration, the five `layer(...)` modifiers, and the `:where()`
  in `theme.css`. Then delete the scope script and its build step. The 13
  consumer-host stories fail first, which is why we keep them.
