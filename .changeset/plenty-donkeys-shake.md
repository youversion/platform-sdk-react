---
'@youversion/platform-core': major
'@youversion/platform-react-hooks': major
'@youversion/platform-react-ui': major
---

Scope all SDK CSS to `data-yv-sdk` subtrees, so the global CSS of a host app
cannot change SDK components.

Every SDK selector now carries the gate `:is([data-yv-sdk], [data-yv-sdk] *)`.
The stylesheet then ships in two halves: everything on a property exemption list
stays unlayered and normal, and every other declaration goes into a cascade layer
named `yv` and carries `!important`. `theme.css` also declares the inherited
properties (`font`, `color`, `box-sizing`, `margin`, `padding`, `border`) on SDK
roots and on their descendants. A gate on a selector does not stop inheritance
from consumer DOM.

**What this corrects.** A host reset such as `* { box-sizing: content-box }`, a
bare `button { padding: 1rem }`, Tailwind Preflight, a `body { font-family;
color; line-height }` block, `button { padding: 2rem !important }` and
`#app button { padding: 1rem }` all changed the appearance of SDK components
before. None of them change it now. A regression harness in
`packages/ui/src/components/style-isolation.stories.tsx` measures every component
against six host-CSS fixtures and asserts zero leaks on all of them.

**What breaks.** Any consumer CSS that overrides an SDK declaration.

- Rules that target SDK internals (our class names, `data-slot` values or DOM
  structure) now lose the cascade. SDK rules gained specificity, from `0,1,0` to
  `0,2,0` and above.
- Rules that depend on inheritance into SDK components now lose. The SDK declares
  those properties itself.
- **Rules that use `!important` now lose too.** For important declarations the
  cascade reverses layer order and ranks unlayered CSS last, so a declaration in
  `@layer yv` beats an unlayered important one at any specificity. This was the
  documented escape hatch in earlier previews of this release. It is gone.

**What you can still change.** A short property list stays outside the layer,
because our popovers and animations set it at runtime: `position`,
`top`/`right`/`bottom`/`left`, `inset-*`, `z-index`, `min-width`, `visibility`,
`pointer-events`, `transform` and the rest of the transform pipeline, `opacity`,
`height`, `filter`, every `animation-*` and `transition-*`, `font-size`,
`background-color`, `border-*` and their shorthands, and every `--*` custom
property.

**How to migrate.** Replace each consumer CSS override with a supported path:

1. Set `--yv-*` design tokens on `[data-yv-sdk]`.
2. Use the `theme` prop on `YouVersionProvider`, or the `background` prop on a
   component.
3. Open an issue if neither path covers your case.

For the rationale and the rejected alternatives (`@scope` and shadow DOM), read
`docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md` and
`docs/adr/0006-layer-and-importantize-the-sdk-sheet.md`.
