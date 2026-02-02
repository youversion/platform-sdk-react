# @youversion/platform-react-ui

## OVERVIEW
Complete UI layer with many Bible components: BibleTextView, VerseOfTheDay, BibleReader, BibleChapterPicker, BibleVersionPicker, YouVersionAuthButton, BibleWidgetView, BibleAppLogoLockup

**Related packages:**
- For lower-level API clients → see `packages/core/AGENTS.md`
- For React hooks without UI → see `packages/hooks/AGENTS.md`

## STRUCTURE
```
components/            # Public Bible components (exported)
components/ui/         # Internal Radix primitives (not exported)
lib/                   # Utilities (injectStyles, utils)
src/index.ts           # Entry point with style injection side effect
```

## PUBLIC API
- Components exported from `src/components/`
- Re-exports from `@youversion/platform-core`:
  - `SignInWithYouVersionPermission`, `SignInWithYouVersionResult`, `YouVersionAPIUsers`
  - `ApiConfig`, `AuthenticationState` types
- Re-exports from `@youversion/platform-react-hooks`:
  - `YouVersionProvider`, `useYVAuth`, `UseYVAuthReturn` type

## DOs / DON'Ts

✅ Do: Use hooks from `@youversion/platform-react-hooks` for data; keep components thin
✅ Do: Use Radix UI primitives from `components/ui/` for low-level behaviors (modals, popovers, etc.)
✅ Do: Use Tailwind classes with the `yv:` prefix only
✅ Do: Use semantic theme tokens (`yv:text-muted-foreground`, `yv:bg-destructive`) instead of arbitrary colors
✅ Do: Keep components SSR-safe (see SSR SAFETY section below)

❌ Don't: Make raw network requests from UI components
❌ Don't: Import from `@youversion/platform-core` directly (except re-exports in index.ts)
❌ Don't: Add global CSS files; all styling goes through Tailwind build and `injectStyles`
❌ Don't: Use unprefixed Tailwind classes (causes collisions in consumer apps)
❌ Don't: Access `window`, `document`, or browser APIs outside of `useEffect`
❌ Don't: Use `useLayoutEffect` (causes React warnings during SSR)

## CONVENTIONS
- React 19+ peer dependency
- Radix UI primitives for accessibility
- Tailwind CSS via @tailwindcss/cli v4
- tsup for bundling, tsc for type declarations

## STYLING
**Auto-injected on import**: `src/index.ts` calls `injectStyles()` on module load
- CSS embedded as `__YV_STYLES__` constant via tsup define (no separate CSS file)
- Built Tailwind CSS: `dist/tailwind.css` → injected as JS string at build time
- Each component includes a `data-yv-sdk` attribute on its root element for style scoping (consumers don't need to add this)
- Tailwind CSS classes must be prefixed with `yv:` to prevent class naming collision when someone uses our components in their app. For example, `mt-4` becomes `yv:mt-4`
- Light/dark mode via CSS variables (`[data-yv-sdk]`)
- Use semantic theme tokens (`yv:text-muted-foreground`, `yv:bg-destructive`) instead of arbitrary color values

### Usage Examples

```tsx
// BibleTextView - Display a Bible verse
<BibleTextView reference="JHN.3.16" versionId={111} />
```

```tsx
// VerseOfTheDay - Daily verse card with optional features
<VerseOfTheDay
  versionId={111}              // NIV translation
  showSunIcon={true}
  showShareButton={true}
  showBibleAppAttribution={true}
  size="default"               // or "lg"
/>
```

```tsx
// BibleReader - Full reading experience (compound component)
<BibleReader.Root
  versionId={111}
  book="JHN"
  chapter="1"
  fontSize={16}
  lineHeight={1.6}
  fontFamily="Inter"
  showVerseNumbers={true}
  background="light"           // or "dark"
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
      versionId={111}
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
// BibleVersionPicker - Bible translation selection (controlled component)
function MyComponent() {
  const [versionId, setVersionId] = useState(111);

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
// BibleWidgetView - Embeddable Bible passage widget
<BibleWidgetView
  reference="JHN.3.16-17"      // USFM format: "BOOK.CHAPTER.VERSE" or range
  versionId={111}
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

## SSR SAFETY
Components must work with SSR frameworks (Next.js, Remix, etc.) without errors or warnings:

- **All browser API access must be inside `useEffect`** - never access `window`, `document`, `navigator`, `localStorage`, or DOM APIs at module level or during render
- **Use `useEffect` instead of `useLayoutEffect`** - `useLayoutEffect` logs warnings during SSR; since our components typically start hidden/closed, the visual flash concern doesn't apply
- **Guard dynamic imports** - polyfills and browser-only code should be loaded inside `useEffect`
- **Props like `anchorElement` will be `null` during SSR** - always check before accessing

Example pattern for browser-only code:
```tsx
useEffect(() => {
  // Safe: only runs on client after hydration
  if ('anchorName' in document.documentElement.style) {
    // native support
  } else {
    // load polyfill
  }
}, []);
```

## CRITICAL
- **Side effect**: importing package injects styles automatically
- Never skip build:css step (styles required for __YV_STYLES__ constant)
- Always rebuild after CSS changes
