---
'@youversion/platform-core': major
'@youversion/platform-react-hooks': major
'@youversion/platform-react-ui': major
---

Scope all SDK CSS to `data-yv-sdk` subtrees, so the global CSS of a host app
cannot change SDK components.

Every SDK selector now carries the gate `:is([data-yv-sdk], [data-yv-sdk] *)`,
and the stylesheet ships in no cascade layer. `theme.css` also declares the
inherited properties (`font`, `color`, `box-sizing`, `margin`, `padding`,
`border`) on SDK roots and on their descendants. A gate on a selector does not
stop inheritance from consumer DOM.

**What this corrects.** A host reset such as `* { box-sizing: content-box }`, a
bare `button { padding: 1rem }`, Tailwind Preflight, or a `body { font-family;
color; line-height }` block changed the appearance of SDK components before. None
of them change it now. A regression harness in
`packages/ui/src/components/style-isolation.stories.tsx` measures every component
and asserts zero leaks.

**What breaks.** Any consumer CSS that overrides an SDK declaration.

- Rules that target SDK internals (our class names, `data-slot` values or DOM
  structure) now lose the cascade. SDK rules gained specificity, from `0,1,0` to
  `0,2,0` and above.
- Rules that depend on inheritance into SDK components now lose. The SDK declares
  those properties itself.
- Rules that use `!important` still win. That is the one remaining hole, and
  `docs/style-isolation-residual-leak.md` records it.

**How to migrate.** Replace each consumer CSS override with a supported path:

1. Set `--yv-*` design tokens on `[data-yv-sdk]`.
2. Use the `theme` prop on `YouVersionProvider`, or the `background` prop on a
   component.
3. Open an issue if neither path covers your case.

For the rationale and the rejected alternatives (`@layer`, `@scope` and shadow
DOM), read `docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md`.
