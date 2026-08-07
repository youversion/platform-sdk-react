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

The build rewrites every SDK selector to `:is([data-yv-sdk], [data-yv-sdk] *)`.
A rule applies only inside a subtree that carries that attribute. See
[ADR-0005](../../docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md),
[ADR-0006](../../docs/adr/0006-layer-and-importantize-the-sdk-sheet.md) and
[ADR-0007](../../docs/adr/0007-convert-rem-to-px-in-the-sdk-sheet.md).

- **Put `data-yv-sdk` on the root element of every new exported component.**
  Without the attribute, the component renders with no SDK styling.
- Consumers never add the attribute. The components add it themselves.
- Internal primitives in `src/components/ui/` carry no attribute, on purpose.
  They normally render inside a stamped public component, and a second stamp
  does nothing.
- **Portal exception:** when a `ui/` primitive portals outside every stamped
  ancestor (for example Radix Dialog Overlay/Content into `document.body`), it
  MUST stamp `data-yv-sdk` (and `data-yv-theme` when theme applies). See
  `src/components/ui/dialog.tsx`.
- **The sheet ships in two halves, split by property.** Every property on the
  exemption list in `scripts/scope-selectors.mjs` stays unlayered and normal.
  Everything else goes into `@layer yv` and gets `!important`. Layer order
  reverses for important declarations and ranks unlayered last, so the layered
  half beats a consumer `!important` rule at any specificity. The unlayered half
  keeps its pre-ADR-0006 cascade position, because a layered *normal*
  declaration would lose to ordinary consumer CSS.
- **Never importantize a property something sets at runtime.** An author
  `!important` outranks the inline `style` attribute and the CSS animation
  origin. Radix positions poppers inline; our keyframes animate `opacity`,
  `transform`, `height` and `filter`. Add to `EXEMPT_PROPERTIES` with a reason,
  never to "be safe". `!important` inside `@keyframes` is invalid CSS.
- `packages/core/src/styles/theme.css` declares the inherited properties
  (`font`, `color`, `box-sizing`, `margin`, `padding`, `border`) on the root and
  on the descendants. The gate alone does not stop inheritance from consumer DOM.
- **The sheet ships `px`, never `rem`.** `scope-selectors.mjs` converts every
  `rem` length to `px` at 1rem = 16px, and fails the build if one survives. A
  `rem` resolves against the *document root*, so a host `html { font-size }`
  rescales it and no selector, layer or `!important` can stop that.
  `src/styles/global.css` also declares `font-size: 16px` on `[data-yv-sdk]`,
  which closes the inheritance half of the same leak.
- **Write `px` in an inline `style` prop, not `rem`.** An inline style never
  passes through the build, so the rebase cannot reach it. The `remRebase`
  harness group is the backstop.
- Three residuals remain: a consumer rule that is `!important` *and* in a layer
  declared before `yv`, the exempt properties, and the root `font-size` we leave
  overridable on purpose.
  [docs/style-isolation-residual-leak.md](../../docs/style-isolation-residual-leak.md)
  records all three.
- The regression harness is `src/components/style-isolation.stories.tsx`, with
  `src/test/consumer-host.ts` and `src/test/style-diff.ts`. Add a story there when
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
  1. `build:css`: Tailwind CLI, `src/styles/global.css` to `.cache/tailwind.raw.css`
  2. `build:css:scope`: `scripts/scope-selectors.mjs`, adds the gate to every
     selector, converts every `rem` length to `px`, splits the sheet into the
     unlayered exempt half and the `@layer yv` important half, writes
     `dist/tailwind.css`. It re-parses its own output and fails on an ungated
     selector, a non-exempt normal declaration, an exempt important declaration,
     an `!important` inside `@keyframes`, a `@keyframes` animating a property
     missing from the exemption list, a surviving `rem` length, or a missing or
     misplaced `@layer yv` block.
  3. `build:js`: tsup, injects `dist/tailwind.css` as the `__YV_STYLES__` constant
  4. `verify:styles`: `scripts/verify-styles.js`, fails the build if the gate is absent, if `@layer yv{` is absent, or if a `@layer yv-sdk-*` block remains
  5. `build:types`: tsc declarations

  If you skip `build:css`, `__YV_STYLES__` is empty. If you skip
  `build:css:scope`, the bundle ships CSS without the gate, and `verify:styles`
  rejects it.
- **Keep all three watchers in `dev` and `storybook`.** Tailwind writes
  `.cache/tailwind.raw.css`, and `scope-selectors.mjs --watch` adds the gate and
  writes `dist/tailwind.css`. If you point the Tailwind watcher at
  `dist/tailwind.css`, it overwrites the gated file with ungated output on the
  next content rescan. A dev server started before this chain existed continues
  to do this until you restart it.
- Always rebuild after CSS changes
