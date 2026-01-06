# AGENTS.md

## OVERVIEW
Complete UI layer with 7 Bible components: BibleTextView, VerseOfTheDay, BibleReader, BibleChapterPicker, BibleVersionPicker, YouVersionAuthButton, BibleWidgetView, BibleAppLogoLockup

## STRUCTURE
```
components/            # Public Bible components (exported)
components/ui/         # Internal Radix primitives (not exported)
lib/                   # Utilities (injectStyles, utils)
src/index.ts           # Entry point with style injection side effect
```

## PUBLIC API
- Components exported from `src/components/`
- Re-exports: `YouVersionProvider`, `useYVAuth` from @youversion/platform-react-hooks
- All components use React.forwardRef, accept standard HTML attributes

## CONVENTIONS
- React 19.1.2+ peer dependency
- Radix UI primitives for accessibility
- Tailwind CSS via @tailwindcss/cli 4.1.15
- tsup for bundling, tsc for type declarations

## STYLING
**Auto-injected on import**: `src/index.ts` calls `injectStyles()` on module load
- CSS embedded as `__YV_STYLES__` constant via tsup define (no separate CSS file)
- Built Tailwind CSS: `dist/tailwind.css` → injected as JS string at build time
- Light/dark mode via CSS variables (`[data-yv-sdk]`)

## TESTING
- Vitest + jsdom for unit tests (`*.test.tsx`)
- Playwright for Storybook integration tests (`vitest run --project storybook`)
- Test setup: `src/test/setup.ts`

## BUILD ORDER
```bash
pnpm build:css    # Tailwind build + strip-layers.js
pnpm build:js     # tsup bundling with __YV_STYLES__ injection
pnpm build:types  # tsc declarations
```

## CRITICAL
- **Side effect**: importing package injects styles automatically
- Never skip build:css step (styles required for __YV_STYLES__ constant)
- Always rebuild after CSS changes
