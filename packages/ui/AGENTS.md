# @youversion/platform-react-ui

## OVERVIEW
Complete UI layer with many Bible components: BibleTextView, VerseOfTheDay, BibleReader, BibleChapterPicker, BibleVersionPicker, YouVersionAuthButton, BibleCard (formerly BibleWidgetView), BibleAppLogoLockup

**Related packages:**
- For lower-level API clients → see `packages/core/AGENTS.md`
- For React hooks without UI → see `packages/hooks/AGENTS.md`

The public API is whatever `src/index.ts` exports, including its re-exports from
core and hooks. Public components live in `src/components/`; `src/components/ui/`
holds internal Radix primitives that are deliberately **not** exported. The two
exceptions are `Separator` and `Textarea`, which `src/components/index.ts` does
export — treat those two as public API and breaking-change territory.

## DOs / DON'Ts

✅ Do: Use hooks from `@youversion/platform-react-hooks` for data; keep components thin
✅ Do: Use Radix UI primitives from `components/ui/` for low-level behaviors (modals, popovers, etc.)
✅ Do: Use Tailwind classes with the `yv:` prefix only
✅ Do: Use semantic theme tokens (`yv:text-muted-foreground`, `yv:bg-destructive`) instead of arbitrary colors
✅ Do: Put `data-yv-sdk` on the root element of every new exported component

❌ Don't: Make raw network requests from UI components
❌ Don't: Import from `@youversion/platform-core` directly (except re-exports in index.ts)
❌ Don't: Add global CSS files; all styling goes through Tailwind build and `<YvStyles />`
❌ Don't: Use unprefixed Tailwind classes (causes collisions in consumer apps)

## CONVENTIONS
- React 19+ peer dependency
- Radix UI primitives for accessibility
- Tailwind CSS via @tailwindcss/cli v4
- tsup for bundling, tsc for type declarations

## STYLING
**React 19 `<style precedence>`**: The `YouVersionProvider` wrapper (in `src/components/YouVersionProvider.tsx`) renders `<YvStyles />` once, which outputs a `<style href="yv-sdk-styles" precedence="yv-sdk">` element. React handles hoisting to `<head>`, deduplication, SSR streaming, and Suspense integration. Individual components do NOT render `<YvStyles />` — it's centralized in the provider.
- CSS embedded as `__YV_STYLES__` constant via tsup define
- Built Tailwind CSS: `dist/tailwind.css` → embedded as JS string at build time
- Static CSS also available via `import '@youversion/platform-react-ui/styles.css'` for non-React consumers
- Tailwind CSS classes must be prefixed with `yv:` to prevent class naming collision when someone uses our components in their app. For example, `mt-4` becomes `yv:mt-4`
- Light/dark mode via CSS variables (`[data-yv-sdk]`)
- Use semantic theme tokens (`yv:text-muted-foreground`, `yv:bg-destructive`) instead of arbitrary color values

### Style isolation (`data-yv-sdk`)

Every SDK selector is rewritten at build time to `:is([data-yv-sdk], [data-yv-sdk] *)`.
A rule only applies inside a subtree stamped with that attribute. See
[ADR-0005](../../docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md).

- **Every new exported component must put `data-yv-sdk` on its root element.**
  Without the attribute the component renders with no SDK styling at all.
- Consumers never add the attribute. Components add it themselves.
- Internal primitives in `src/components/ui/` are deliberately unstamped. They
  always render inside a stamped public component, and stamping them again would
  do nothing.
- SDK CSS is unlayered on purpose. Unlayered author CSS beats every named layer
  regardless of specificity, so a layer can never win against a consumer's
  ordinary rules.
- `packages/core/src/styles/theme.css` declares the inherited properties
  (`font`, `color`, `box-sizing`, `margin`, `padding`, `border`) on the root and
  on descendants. Gating alone does not stop inheritance from consumer DOM.
- Consumer `!important` still wins. That residual is measured in
  [docs/style-isolation-residual-leak.md](../../docs/style-isolation-residual-leak.md).
- The regression harness is `src/components/style-isolation.stories.tsx` with
  `src/test/hostile-host.ts` and `src/test/style-diff.ts`. Add a story there when
  you add an exported component.

## REFERENCES

Storybook stories are the live reference for every component's props and states.
`examples/vite-react` at the repo root shows integration in a real app. Both are
type-checked; prefer them over any prose description of a component's API.

## TESTING
- **Prefer Storybook** for UI component tests using the `play` function
- Every Storybook test with a play function needs `tags: ['integration']`
- Vitest + jsdom for unit tests (`*.test.tsx`); setup is `src/test/setup.ts`

## CRITICAL
- **No module side effects**: styles are rendered via React 19 `<style precedence>` in the `YouVersionProvider` wrapper
- **Build sub-steps are order-dependent**. The chain is:
  1. `build:css` — Tailwind CLI, `src/styles/global.css` → `.cache/tailwind.raw.css`
  2. `build:css:scope` — `scripts/scope-selectors.mjs`, gates every selector, writes `dist/tailwind.css`
  3. `build:js` — tsup, injects `dist/tailwind.css` as the `__YV_STYLES__` constant
  4. `verify:styles` — `scripts/verify-styles.js`, fails the build if the gate is missing or a `@layer yv-sdk-*` block survived
  5. `build:types` — tsc declarations

  Skip `build:css` and `__YV_STYLES__` is empty. Skip `build:css:scope` and the
  bundle ships ungated CSS, which `verify:styles` then rejects.
- **`dev` and `storybook` must keep all three watchers.** Tailwind watches into
  `.cache/tailwind.raw.css`, and `scope-selectors.mjs --watch` gates it into
  `dist/tailwind.css`. Point Tailwind's watcher straight at `dist/tailwind.css`
  and it overwrites the gated file with ungated output on the next content rescan.
  A dev server started before this chain existed keeps doing exactly that until
  you restart it.
- Always rebuild after CSS changes
