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
- Each component includes a `data-yv-sdk` attribute on its root element for style scoping (consumers don't need to add this)
- Tailwind CSS classes must be prefixed with `yv:` to prevent class naming collision when someone uses our components in their app. For example, `mt-4` becomes `yv:mt-4`
- Light/dark mode via CSS variables (`[data-yv-sdk]`)
- Use semantic theme tokens (`yv:text-muted-foreground`, `yv:bg-destructive`) instead of arbitrary color values

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
- **Build sub-steps are order-dependent**: `build:css` (Tailwind + `strip-layers.js`) → `build:js` (tsup, injects `__YV_STYLES__`) → `build:types`. Never skip `build:css` — without it the `__YV_STYLES__` constant is empty.
- Always rebuild after CSS changes
