# @youversion/platform-react-ui

React Bible components built on `@youversion/platform-react-hooks` and Radix UI.

Keep this file brief. Put task-specific guidance behind a pointer.

## Gotchas

- Public exports come from `src/index.ts`, including core and hooks re-exports. `src/types.ts` star-exports core, so adding a core export changes this package's public surface too.
- `src/components/ui/` primitives are internal except `Separator` and `Textarea`, which are public API. Treat changes to those exports as potential breaking changes.

## Guardrails

- Fetch data through hooks, rather than raw HTTP or core API clients called from components. Reuse core types and runtime-agnostic helpers instead of implementing UI-local copies.
- Use Radix primitives for low-level interactions and Tailwind classes with the `yv:` prefix. Use semantic theme tokens instead of arbitrary colors.
- Keep styles within the Tailwind build and React style injectors below, without global CSS files or module-load injection.

## Styling

**React 19 `<style precedence>`**: `YouVersionProvider` renders `<YvStyles />` (`href="yv-sdk-styles"`). That sheet is Provider chrome (`dist/chrome.css`). Scripture and interactive roots render `<YvComponentStyles />` (`href="yv-sdk-components"`, the full `dist/tailwind.css`) and `BibleTextView` also renders `<YvReaderStyles />`. The three injectors are separate modules so Provider does not import the fat sheets. Different hrefs so React 19 does not drop the fat sheet. React hoists, dedupes, and streams the tags.
- CSS embedded via tsup define: chrome uses `__YV_STYLES__`, full utilities use `__YV_COMPONENT_STYLES__`, and reader uses `__YV_READER_STYLES__`.
- Public stylesheet stays `import '@youversion/platform-react-ui/styles.css'` (`dist/styles.css`: utilities plus reader). JS still injects the three sheets separately.
- Each component includes a `data-yv-sdk` attribute on its root element for style scoping (consumers don't need to add this)
- Light/dark mode via CSS variables (`[data-yv-sdk]`)
- Build sub-steps are order-dependent: `build:css` (including `preserve-host-revert-layer.js`, which keeps `-webkit-appearance` through minification), then `build:js` (which embeds the sheets), then `build:types`. Always rebuild after CSS changes; never skip `build:css`.

## Usage

Component props or states: read the component's Storybook stories. App integration: read `examples/vite-react` at the repo root. Both are type-checked references.

## Testing

Unit tests, coverage, or Storybook journeys: read `docs/testing.md` at the repo root for package ownership, hook overrides, and dependency-aware commands.
