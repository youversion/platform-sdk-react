# 5. Scope SDK CSS to `[data-yv-sdk]` subtrees instead of cascade layers

Date: 2026-08-06

## Status

Accepted. Supersedes the cascade-layer strategy introduced in `bcfb868` (v1.20.0).

## Context

A partner drops `BibleTextView` into their app. Their `button { padding: 1rem }`
reshapes our version picker trigger. Their `body { font-family: Comic Sans }`
bleeds into our verse text. The partner sees a broken Bible experience and has no
supported way to fix it. YPE-4113 is the spike that closes this.

### This decision has flipped three times already

| Date | Commit | Version | Position |
| --- | --- | --- | --- |
| 2026-01-09 | `8e3a672` | 0.10.1 | Added `scripts/strip-layers.js`. SDK CSS out of all layers. |
| 2026-01-13 | `694325f` | 1.6.2 | "Opt out of CSS layers." Deleted `strip-layers.js`. |
| 2026-03-09 | `bcfb868` | 1.20.0 | Re-adopted layers, written into `global.css` source. |

Only the changelog records the last reversal. This ADR exists so there is not a
fourth one by accident.

### Why layers can never win

`global.css:33` declared nine layers and put every SDK rule in a `yv-sdk-*` one.
CSS Cascade 5 [§6.1](https://www.w3.org/TR/css-cascade-5/#cascade-sort) states
that any declaration not assigned to a layer joins an implicit final layer, and
that layer order is compared **before** specificity.
[MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) puts it plainly:
"Styles that are not defined in a layer always override styles declared in named
and anonymous layers."

So a consumer's unlayered `button {}` at 0,0,1 beat every `yv:` utility, at any
specificity. That was not a bug in the layer setup. It was the layer setup
working as designed. `bcfb868` chose it deliberately to stop SDK styles
overriding consumer CSS, and it guaranteed the reverse leak in the same move.

### Two leak channels, not one

| Channel | Example | Why it wins |
| --- | --- | --- |
| Direct match | `button { padding: 1rem }` hits our button | Unlayered beats layered at any specificity |
| Inheritance | `body { color: green }` flows into our text | The SDK never declared `color`, so inheritance applies |

The second channel is independent of the cascade. An inherited value applies
wherever the element declares nothing. No amount of specificity or layer rank
changes that. Only a declaration does.

## Decision

### 1. Unlayered SDK CSS, with every selector gated on `[data-yv-sdk]`

Stop protecting the consumer with cascade rank. Protect them with territory.

```css
/* before */
.yv\:mt-4 { margin-top: 1rem }

/* after */
:is([data-yv-sdk], [data-yv-sdk] *).yv\:mt-4 { margin-top: 1rem }
```

`:is()` takes the specificity of its most specific argument, so the gate adds
exactly 0,1,0. The compound form matches the marked root and its descendants in
one selector.

This fixes both directions at once:

- **Outbound.** SDK CSS cannot match DOM the SDK did not render. That is a
  structural guarantee, not a cascade-priority bet, and it is stronger than what
  layers gave the consumer.
- **Inbound.** Inside an SDK subtree, every SDK rule sits at 0,1,0 or better and
  beats a consumer's bare element selectors at 0,0,1 and universal selectors at
  0,0,0.

The rewrite happens after the Tailwind build, in
`packages/ui/scripts/scope-selectors.mjs`. Tailwind v4 has no native equivalent:
`prefix(yv)` only renames classes, `@import "tailwindcss" important` takes no
selector argument, and v3's `important: '#app'` has no v4 successor. Wrapping the
import in a selector is disclaimed by Adam Wathan as working "mostly by
coincidence"
([discussion #13779](https://github.com/tailwindlabs/tailwindcss/discussions/13779)),
and it provably breaks: flattened, it emits `[data-yv-sdk] :root`, which can never
match.

The script uses Lightning CSS rather than a regex or `postcss-prefix-selector`.
Its `Selector` visitor is a typed structural API, so it cannot mangle an escaped
class name like `.yv\:mt-4`. `@keyframes`, `@font-face` and `@property` produce no
`Selector` nodes, so they are skipped by construction. It flattens CSS nesting,
which matters because `bible-reader.css` and `@utility touch-hitbox` emit nested
`&` rules that a naive prefixer would corrupt. `postcss-prefix-selector@2.1.1` was
rejected after testing against this repo's real output: it rewrites `:host` into
`[data-yv-sdk] :host`, which can never match, silently dropping every theme
variable.

`:root` and `:host` stay ungated. Those rules define only `--yv-*` custom
properties. They render nothing and cannot collide.

The script re-parses its own output and fails the build on any ungated selector.
That check, not a comment or a string match, is the guarantee.
`scripts/verify-styles.js` adds two more gates: `dist/index.js` must contain
`:is([data-yv-sdk],[data-yv-sdk] *)`, and it must not contain `@layer yv-sdk-`.
The second assertion names the `yv-sdk-` prefix on purpose. Tailwind emits
`@layer properties` on its own for the `@property` fallback, regardless of our
directives.

### 2. Declare the inherited properties, and close the holes gating cannot reach

Gating raises specificity. It does nothing about a property the SDK never
declares. Three edits to `packages/core/src/styles/theme.css` close that class of
hole:

1. **Drop the `:where()`.** The reset block was `:where([data-yv-sdk])` at 0,0,0,
   which a bare `button {}` beat. It is now `[data-yv-sdk]`.
2. **Pin the inherited set on the SDK root**: `font-family`, `color`,
   `letter-spacing`, `word-spacing`, `text-align`, `text-transform`,
   `text-indent`, `white-space`, `text-shadow`, `font-variant`. Every element
   carrying `data-yv-sdk` re-establishes the whole set, so portalled surfaces
   that inherit straight from `document.body` are covered. `direction` is left
   alone: `bible-reader.css` handles RTL, and `text-align: start` is
   direction-aware.
3. **Add `color: inherit` to the descendant block, and the box model to the
   root.** These two were found by the harness, not by the plan. Pinning `color`
   on the root stops `body { color: … }`, because that value only arrives by
   inheritance. It does nothing about `ul { color: #f0f }`, which matches an SDK
   element directly. The descendant block is `[data-yv-sdk] *`, which misses the
   marked element, but a consumer's `* { box-sizing: content-box }` does not miss
   it.

`revert-layer` was considered and rejected. Per CSS Cascade 5 §7 it rolls a
property back to the layer below, or to the previous origin when there is none.
For an inherited property the UA origin declares nothing, so the rolled-back
value is the inherited value, which is the consumer's `body` rule.
`revert-layer` undoes rules that target our elements. It does not stop inherited
bleed.

### 3. `@scope` rejected, without testing

`@scope` scopes the rules written inside it. It does not block inbound styles.
[MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) is explicit:
"while `@scope` allows you to isolate the application of selectors to specific DOM
subtrees, it does not completely isolate the applied styles to within those
subtrees. This is most noticeable with inheritance. Properties that are inherited
by children (for example `color` or `font-family`) will still be inherited,
beyond any set scope limit."

[CSS Cascade 6 §2.5.3](https://www.w3.org/TR/css-cascade-6/#scope-nesting)
constrains only the selectors in the block. A stylesheet elsewhere in the
document stays free to match elements inside a scoped subtree. Scope proximity is
a cascade criterion that ranks *below* specificity, so it cannot win a fight the
gate does not already win.

`@scope` would give us what `:is([data-yv-sdk], [data-yv-sdk] *)` already gives
us, minus the specificity, plus a Baseline "newly available" (December 2025)
dependency. There is nothing to test.

### 4. Shadow DOM not adopted. The trigger condition, fixed before the numbers existed

**Recommend shadow DOM if and only if the residual leak includes rules that do
not use `!important`.**

A consumer writing `!important` against our elements is making an explicit,
deliberate choice. Treat that as out of contract. The threshold was written into
the design discussion before the harness produced a single number, so the
recommendation cannot be retrofitted to the answer.

**Measured result: the residual is 100 percent `!important`.**
`docs/style-isolation-residual-leak.md` has the numbers. Four of the five hostile
groups report zero leaks on all thirteen hostile-host stories. The only surviving
leaks come from two consumer declarations, both `!important`, both targeting
`button`: 880 leaks on 155 buttons across 8 components. Zero non-`!important`
rules survive.

The threshold is not met. Shadow DOM is not adopted.

The tradeoffs it would have carried, all evidenced during the research:

| Tradeoff | Evidence |
| --- | --- |
| Radix portals mount to `document.body`, outside the shadow root | `popover.tsx:43`, `dialog.tsx:28`; no `container` prop anywhere in the repo |
| Radix `FocusScope` breaks at the boundary; `document.activeElement` returns the host | [radix-ui/primitives#3353](https://github.com/radix-ui/primitives/issues/3353), open |
| `aria-hidden` hides open dropdown content from the a11y tree | [radix-ui/primitives#1772](https://github.com/radix-ui/primitives/issues/1772), open |
| Dismissable-layer outside-click misreads `event.target` as the host | [radix-ui/primitives#2433](https://github.com/radix-ui/primitives/pull/2433), open, "Needs Investigation" |
| Font and colour inheritance still pierce the boundary | [MDN, "Using shadow DOM"](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM); top-level shadow elements inherit from the host |
| React 19 `<style precedence>` hoisting inside a shadow root is undocumented | No React doc covers it; `facebook/react#21728` is a type change only |
| Tailwind v4 does not target shadow DOM | Tailwind Labs, [discussion #15556](https://github.com/tailwindlabs/tailwindcss/discussions/15556): "Shadow dom has other issues around `@property` which we rely on in v4" |
| Layer order is per encapsulation context | CSS Cascade 5 [§6.4.3](https://www.w3.org/TR/css-cascade-5/#layer-ordering) |
| Theming moves per root | Tokens are declared on `[data-yv-sdk]` and re-stamped per portal today |

Note the third row against the fifth. Shadow DOM would not have closed the
inheritance channel either. It blocks selector matching, not inheritance, so
`theme.css` would still need every declaration in decision 2.

### 5. No consumer opt-out

There is no `styleIsolation` prop on `YouVersionProvider`. Customization is
`--yv-*` design tokens plus component props, which is what YPE-4113 decided.

An opt-out would reintroduce the ambiguity this ADR closes, double the surface we
test, and keep the leaky path alive forever. This matches `<YvStyles />` and
`<YvFonts />`, neither of which has one. ADR-0004 records the same choice for the
same reason. Adding a prop later is non-breaking if a real partner reports a real
break.

## Consequences

- **Every exported component now renders as designed under adversarial global
  CSS.** Thirteen hostile-host stories in
  `packages/ui/src/components/style-isolation.stories.tsx` measure 32 computed
  properties on every element of the subtree and fail CI if the leak reopens.

- **This is a breaking change, and it ships as a major.** Token overrides
  survive: a consumer's `[data-yv-sdk] { --yv-primary: … }` ties our token block
  at 0,1,0 and wins on source order, and
  `ConsumerTokenOverrideStillApplies` asserts it. What breaks is any consumer
  overriding an SDK *declaration* with their own CSS. That was never supported,
  but it has worked since `bcfb868`, and someone is relying on it.

- **`dist/tailwind.css` grew 15.7 percent raw and 3.2 percent gzipped**: 97,402
  bytes to 112,665, 13,369 gzipped to 13,800. The gate is one repeated
  33-character string in 462 places, so gzip removes nearly all of it. Selector
  count, `@property` count and `@keyframes` count are identical before and after,
  so no rule was lost.

- **The build chain gained a step.** `build:css` now writes
  `.cache/tailwind.raw.css`, and `build:css:scope` rewrites it into
  `dist/tailwind.css`. Raw, ungated Tailwind output never reaches `dist/`, which
  is what gets published. `dev` and `storybook` run the scope script in `--watch`
  alongside the Tailwind watcher.

- **A component without `data-yv-sdk` now loses all of its styling.** The
  attribute went from a scoping convenience to a hard requirement.
  `packages/ui/src/components/scope-attribute.test.tsx` renders every export and
  fails on a missing attribute. It also fails on an export it does not know
  about, so a new component cannot slip through by being unlisted.

- **Every stamp has to name a theme, and it has to be the enclosing scope's
  theme.** `theme.css` declares the light tokens on the bare `[data-yv-sdk]`
  selector with dark as a nested override. An element that gains `data-yv-sdk`
  inside a dark scope re-declares the light tokens on itself and reverts. This is
  why `ui/button.tsx` is deliberately not stamped: `Button` has no local theme in
  scope, `useTheme()` returns the provider theme, and `BibleReader.Root` resolves
  its own from `background`. Auditing all 31 call sites is a separate change.
  `Button` is safe unstamped because it is not exported and always sits inside a
  stamped ancestor, which the gate's descendant arm covers.

- **Specificity inside the SDK climbed uniformly.** All 642 utility rules gained
  the same 0,1,0, so relative order among utilities is unchanged. Hand-written
  rules in `global.css` and `bible-reader.css` did shift relative to utilities.
  The integration suite is the only check on that, and it covers computed
  properties rather than visual fidelity.

- **A consumer `!important` rule still reaches our components**, and now that is
  written down with numbers rather than assumed.
  `docs/style-isolation-residual-leak.md` names the rules and the components.
  `packages/ui/README.md` tells consumers the same thing in their language.

- **The reversal, if it is ever needed, is not small.** Restoring layers means
  restoring the `@layer` declaration, the five `layer(...)` modifiers, the
  `:where()` in `theme.css`, and deleting the scope script and its build step.
  The 13 hostile-host stories would go red first, which is the point of keeping
  them.
