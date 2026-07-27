# @youversion/platform-react-ui

## OVERVIEW
Complete UI layer with many Bible components: BibleTextView, VerseOfTheDay, BibleReader, BibleChapterPicker, BibleVersionPicker, YouVersionAuthButton, BibleCard (formerly BibleWidgetView), BibleAppLogoLockup

**Related packages:**
- For lower-level API clients → see `packages/core/AGENTS.md`
- For React hooks without UI → see `packages/hooks/AGENTS.md`

## STRUCTURE
```
components/            # Public Bible components (exported)
components/ui/         # Internal Radix primitives (not exported)
lib/                   # Utilities (yv-styles, utils)
src/index.ts           # Entry point (re-exports components, types, hooks)
```

## PUBLIC API
- Components exported from `src/components/`
- Re-exports from `@youversion/platform-core`:
  - `SignInWithYouVersionPermission`, `SignInWithYouVersionResult`, `YouVersionAPIUsers`
  - `ApiConfig`, `AuthenticationState`, `Highlight` types
- Re-exports from `@youversion/platform-react-hooks`:
  - `YouVersionProvider`, `useYVAuth`, `UseYVAuthReturn` type

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

### Usage Examples

```tsx
// BibleTextView - Display a Bible verse
<BibleTextView reference="JHN.3.16" versionId={3034} />
```

```tsx
// VerseOfTheDay - Daily verse card with optional features
<VerseOfTheDay
  versionId={3034}              // Berean Standard Bible
  showSunIcon={true}
  showShareButton={true}
  showBibleAppAttribution={true}
  size="default"               // or "lg"
/>
```

```tsx
// BibleReader - Full reading experience (compound component)
<BibleReader.Root
  versionId={3034}
  book="JHN"
  chapter="1"
  fontSize={16}
  lineHeight={1.6}
  fontFamily="Inter"
  showVerseNumbers={true}
  background="light"           // or "dark"
  enableHighlights             // opt in to server-backed highlights (default off;
                               // requires YouVersionProvider with includeAuth)
>
  <BibleReader.Content />
  <BibleReader.Toolbar />
</BibleReader.Root>
```

```tsx
// BibleChapterPicker - Book and chapter selection (controlled component)
function MyComponent() {
  const [book, setBook] = useState('GEN');
  const [chapter, setChapter] = useState('1');

  return (
    <BibleChapterPicker.Root
      versionId={3034}
      book={book}
      onBookChange={setBook}
      chapter={chapter}
      onChapterChange={setChapter}
      background="light"
    >
      <BibleChapterPicker.Trigger />
    </BibleChapterPicker.Root>
  );
}
```

```tsx
// BibleVersionPicker - Bible version selection (controlled component)
function MyComponent() {
  const [versionId, setVersionId] = useState(3034);

  return (
    <BibleVersionPicker.Root
      versionId={versionId}
      onVersionChange={setVersionId}
      background="light"
      side="top"               // popover position: "top" | "right" | "bottom" | "left"
    >
      <BibleVersionPicker.Trigger />
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>
  );
}
```

```tsx
// BibleCard - Embeddable Bible passage card (formerly BibleWidgetView)
<BibleCard
  reference="JHN.3.16-17"      // USFM format: "BOOK.CHAPTER.VERSE" or range
  versionId={3034}
  showVersionPicker={true}
  background="light"
/>
```

```tsx
// YouVersionAuthButton - Sign in/out with YouVersion
<YouVersionAuthButton
  redirectUrl="https://example.com/callback"
  onAuthError={(error) => console.error(error)}
  mode="auto"                  // "signIn" | "signOut" | "auto"
  size="default"               // "default" | "short" | "icon"
  variant="default"            // "default" | "outline"
  radius="rounded"             // "rounded" | "rectangular"
  background="light"
/>
```

## TESTING
- **Prefer Storybook** for UI component tests using the `play` function
- All Storybook tests with a play function need to have a `tags: ['integration']`
- Run integration tests: `pnpm test:integration`
- Vitest + jsdom for unit tests (`*.test.tsx`)
- Test setup: `src/test/setup.ts`

## BUILD ORDER
```bash
pnpm build:css    # Tailwind build + strip-layers.js
pnpm build:js     # tsup bundling with __YV_STYLES__ injection
pnpm build:types  # tsc declarations
```

From repo root, `pnpm build` runs Turbo which builds in order:
1. `@youversion/platform-core`
2. `@youversion/platform-react-hooks`
3. `@youversion/platform-react-ui` (build:css → build:js → build:types)

## CRITICAL
- **No module side effects**: styles are rendered via React 19 `<style precedence>` in the `YouVersionProvider` wrapper
- Never skip build:css step (styles required for __YV_STYLES__ constant)
- Always rebuild after CSS changes
