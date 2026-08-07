---
'@youversion/platform-core': major
'@youversion/platform-react-hooks': major
'@youversion/platform-react-ui': major
---

Scope all SDK CSS to `data-yv-sdk` subtrees so a host app's global CSS cannot
reshape SDK components.

Every SDK selector is now gated on `:is([data-yv-sdk], [data-yv-sdk] *)` and ships
unlayered. `theme.css` also declares the inherited properties (`font`, `color`,
`box-sizing`, `margin`, `padding`, `border`) on SDK roots and descendants, because
gating a selector does not stop inheritance from a consumer's DOM.

**What this fixes.** A host reset such as `* { box-sizing: content-box }`, a bare
`button { padding: 1rem }`, Tailwind Preflight, or a `body { font-family; color;
line-height }` block used to change how SDK components rendered. None of them do
anymore. A regression harness in `packages/ui/src/components/style-isolation.stories.tsx`
measures this on every component and asserts zero leaks.

**What breaks.** Any consumer CSS that overrides an SDK declaration.

- Rules targeting SDK internals (our class names, `data-slot` values, or DOM
  structure) now lose the cascade. SDK rules gained specificity, from `0,1,0` to
  `0,2,0` and above.
- Rules relying on inheritance into SDK components now lose. The SDK declares
  those properties itself.
- Rules using `!important` still win. That is the one remaining hole, and it is
  documented in `docs/style-isolation-residual-leak.md`.

**Migrating.** Replace consumer CSS overrides with a supported path:

1. Set `--yv-*` design tokens on `[data-yv-sdk]`.
2. Use the `theme` prop on `YouVersionProvider` or the `background` prop on a
   component.
3. Open an issue if neither covers your case.

Rationale and rejected alternatives, including `@layer`, `@scope`, and shadow
DOM: `docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md`.
