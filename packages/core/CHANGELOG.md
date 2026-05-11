# @youversion/platform-core

## 1.27.0

### Minor Changes

- 8ba253e: Replace module-level injectStyles() side effect with React 19 style precedence hoisting via YouVersionProvider. Add static CSS export at @youversion/platform-react-ui/styles.css for non-React consumers.

## 1.26.1

## 1.26.0

## 1.25.0

## 1.24.0

## 1.23.2

### Patch Changes

- da88c10: Tolerate runtimes without `crypto.randomUUID` by falling back to a non-secure timestamp+random installation id.

## 1.23.1

### Patch Changes

- 48a86d2: fix(core): decode JWT payload claims as UTF-8 to prevent mojibake in non-ASCII user names.

## 1.23.0

### Minor Changes

- ad87585: Add i18next internationalization support with one extractable string ("Verse of The Day"). Adds i18next as a dependency. The SDK creates an isolated i18next instance (no global singleton mutation) and falls back to English by default.

### Patch Changes

- fda3609: fix(ui): preserve API order for suggested languages in BibleVersionPicker
- c47ab70: chore(ui): upgrade Storybook to 10.3.5 and bump MSW deps

## 1.22.3

### Patch Changes

- 7eaf380: Fixed some UI bugs that caused the Bible Reader toolbar and its popovers to overflow past the width of the screen on mobile.

## 1.22.2

### Patch Changes

- 203a28b: fix(ui): show specific Bible passage error messages

## 1.22.1

### Patch Changes

- b8b5cf0: Fixed hooks package bundling to produce proper CJS and ESM outputs, resolving import failures in strict ESM runtimes like Deno.
- 2a64020: Updated the Bible App logo on the BibleCard and VerseOfTheDay React components to the latest designs.

## 1.22.0

### Minor Changes

- ff14f28: We've moved our theme, fonts, and Bible CSS from the React package into our core JS package to make it more framework agnostic so that consumers using any web framework can include our CSS without the React peer dependency.

## 1.21.0

### Minor Changes

- 87ad436: **`@youversion/platform-core`**: Add `transformBibleHtml` — a runtime-agnostic Bible HTML transformer with new `/browser` and `/server` subpath exports.
  - `@youversion/platform-core` — runtime-agnostic core; accepts `parseHtml`/`serializeHtml` adapters so it works with any DOM implementation
  - `@youversion/platform-core/browser` — zero-config convenience wrapper using the native `DOMParser`
  - `@youversion/platform-core/server` — zero-config convenience wrapper using `linkedom` (optional peer dependency)

  The transformer sanitizes API HTML (custom allowlist-based sanitizer, no DOMPurify dependency), wraps verse content for CSS targeting, and embeds footnote data as `data-verse-footnote` / `data-verse-footnote-content` attributes directly in the HTML.

  **`@youversion/platform-react-ui`**: Migrate Bible HTML transformation from the UI package to `@youversion/platform-core/browser`.
  - Removed `isomorphic-dompurify` dependency (lighter bundle)
  - Footnote popover data is now read from DOM attributes at render time instead of a separate data structure
  - Added SSR safety guard — `Verse.Html` returns raw HTML during server rendering and transforms on the client after hydration

## 1.20.2

### Patch Changes

- dd52fbe: fix: use spinner icon instead of "Loading..." text in Bible version button

## 1.20.1

### Patch Changes

- e895fd0: Remove shadow from VerseOfTheDay card, add loading spinner with animated height transition, and match width approach to BibleCard for consistency.

  Replaced Verse.HTML in the VerseOfTheDay component with BibleTextView in favor of the baked-in error state when a Bible Verse cannot load for any reason.

  BibleTextView now is now a forwardRef component, enabling users to pass in a React ref.

## 1.20.0

### Minor Changes

- bcfb868: Fix SDK styles overriding consumer app CSS by wrapping all styles in custom @layer directives (yv-sdk-\*). Declares Tailwind v4's standard layer names (theme, base, components, utilities) before SDK layers to establish cascade priority: consumer Tailwind layers < SDK layers < consumer unlayered CSS. This prevents SDK resets and utilities from bleeding into consumer apps while protecting SDK components from consumer Tailwind styles.

  Fixed a styling bug in the BibleReader.Toolbar when the user is signed in, so that the avatar button is circular versus oblong.

  Fixed the BibleReader.Toolbar's popover button for sign in and sign out to respect dark/light modes and to close the popover when clicked.

## 1.19.0

### Minor Changes

- 030e297: Deprecates hooks and providers that are not used by the UI package or any known consumers. These were inherited from a hackathon project and never adopted. These will be fully removed in the next major version bump.

  Deprecated:
  - `useInitData` — convenience wrapper over `useVersion`, `useBook`, `useChapter` that loses error granularity, drops `refetch`, and has zero consumers. Use the three hooks directly.
  - `useChapterNavigation` — coupled to `ReaderProvider` which nobody uses. The UI package calls `getAdjacentChapter` from core directly.
  - `ReaderProvider`, `ReaderContext`, `useReaderContext` — the UI package built its own `BibleReaderContext` instead. Zero consumers.
  - `VerseSelectionProvider`, `VerseSelectionContext`, `useVerseSelection` — the UI package handles verse selection via props/callbacks. Zero consumers.

## 1.18.1

### Patch Changes

- 325dff9: BibleCard now animates content height transitions when loading new data instead of flashing and abruptly resizing

## 1.18.0

### Minor Changes

- b8c6e1b: In our BibleCard component, we've added an error UI to make it more clear when an error has occurred fetching the Bible verse.

## 1.17.1

### Patch Changes

- a7100fd: We've added support for footnotes in Bible book introduction chapters. This is a rare occurance, but an example can be found in Joshua's introduction chapter when using the TPT Bible Version

## 1.17.0

### Minor Changes

- c3d673e: added error ui for faild verses

### Patch Changes

- a5f91bf: Add cross-book chapter navigation to Bible Reader toolbar with prev/next buttons, intro chapter support, and accessible aria-labels

## 1.16.0

### Minor Changes

- 1c9d542: We've added support for rendering Bible introduction chapters (e.g., JHN.INTRO) in the Bible Reader component

## 1.15.2

### Patch Changes

- aa31bd7: Fixed a styling bug on the BibleReader.Toolbar component. When auth was disabled in the YouVersionProvider, then it caused a layout issue on the toolbar.

## 1.15.1

### Patch Changes

- c030f6c: fix mixed font family in footnotes popover

## 1.15.0

### Minor Changes

- 0fb1d86: Rename `BibleWidgetView` to `BibleCard`. The old `BibleWidgetView` component and `BibleWidgetViewProps` type are still exported but marked as `@deprecated` and will be removed in a future major version.

### Patch Changes

- b8aedbb: Fix Bible Version Picker search input retaining stale text after selecting a version or closing the popover. Search state now resets on version selection and on popover close.

## 1.14.4

### Patch Changes

- 60cffb9: Fix PopoverTrigger components to use 'asChild' prop to avoid console warnings
- 3e1c3dc: Refactor verse footnote extraction and rendering for clarity and correctness
  - Replace TreeWalker-based footnote extraction with clone-and-transform approach
  - Move HTML transformation pipeline into `verse-html-utils.ts` as `transformBibleHtml`
  - Fix space insertion between element siblings when footnotes are removed
  - Fix footnote marker/label mismatch for verses with >26 footnotes
  - Simplify `BibleTextHtml` hooks and use React `onClick` instead of manual event listeners
  - Use `useMemo` for synchronous HTML transformation instead of `useEffect` + `useState`

## 1.14.3

### Patch Changes

- ee7a69b: Fix Tailwind preflight CSS leaking globally into consumer apps. The unscoped `@import 'tailwindcss/preflight.css'` was resetting styles on all elements (h1–h6 font size/weight, margins, padding, list styles, etc.) across the entire page. Preflight resets are now scoped to `[data-yv-sdk]` so they only apply inside SDK components.

## 1.14.2

### Patch Changes

- 0987b6c: This change fixes a bug where the serif font failed to render properly in the Bible reader.

## 1.14.1

### Patch Changes

- 51d97e5: Standardized our default Bible Version to one that does not require opt-in license to use, so that our components work out of the box by default

## 1.14.0

### Minor Changes

- 2d2c597: Added 'system' as an option to YouVersionProvider theme prop that resolves via `prefers-color-scheme` with live OS change listener

## 1.13.0

### Minor Changes

- d5579d5: Add suggested languages to Bible version picker
  - Auto-detect user's preferred language from browser settings instead of defaulting to English
  - Display suggested languages based on available Bible versions and user locale
  - Fetch complete language data with display names for better internationalization
  - Add integration tests and Storybook stories for suggested languages functionality

## 1.12.2

### Patch Changes

- ad912db: Fix broken bible reader when auth is disabled.

## 1.12.1

### Patch Changes

- 165feca: Fix user settings from localStorage not loading in the bible reader

## 1.12.0

### Minor Changes

- 1bafe50: Add all_available and fields parameters to getVersions api call in core package and useVersions in hooks package.

## 1.11.0

### Minor Changes

- a3efcc9: Add fields query param to the getLanguages api in core package

## 1.10.0

### Minor Changes

- ce3e92e: This PR adds verse selection and highlighting to the Bible reader component, preparing the way for highlights. It also includes infrastructure fixes for Storybook test stability in CI.

## 1.9.2

### Patch Changes

- d7fb66a: Replace lucide-react icons dependency with custom SVG icon components to reduce the size of our platform-react-ui bundle

## 1.9.1

### Patch Changes

- b4da78d: YouVersionAuthButton redirectUrl prop is now optional.

## 1.9.0

### Minor Changes

- d4b0071: feat(hooks): Add useLanguage hook to retrieve a language from api

## 1.8.1

### Patch Changes

- 607be3c: Refactor verse HTML transformation to support verse-level highlighting. Extract HTML processing logic to `verse-html-utils.ts` with new `wrapVerseContent()` function that wraps verse content in CSS-targetable `<span class="yv-v">` elements. Simplify footnote extraction using wrapped verse structure. Remove CSS rule preventing text wrapping. Add comprehensive test coverage for verse wrapping behavior.

## 1.8.0

### Minor Changes

- 45516c2: Add recently used versions to the Bible Version Picker
  - Display up to 3 recently selected Bible versions at the top of the picker
  - Persist recent version selections in localStorage
  - Recent versions are searchable and excluded from the main "All Versions" list

## 1.7.0

### Minor Changes

- a3e357e: feat(ui, hook): add sign in/out to bible reader
  - Add sign in/out functionality to the BibleReader component
  - Refactor auth hooks so redirectUri is optional (can be inferred from provider)
  - New icons: gear.tsx and person.tsx for settings/auth UI

## 1.6.2

### Patch Changes

- 694325f: Removing CSS layers approach to prevent CSS conflicts when our components are added to existing apps with global styles.

## 1.6.1

### Patch Changes

- 3f69494: Refactors footnotes implementation to use React portals, improves HTML sanitization, and fixes footnote popover behavior.

## 1.6.0

### Minor Changes

- b0d9f87: feat(ui): add dark mode theme support to BibleTextView and BibleReader
  - Add theme prop (light/dark) to BibleTextView for text theme control
  - Implement theme inheritance from YouVersionProvider via useTheme hook
  - Add data-yv-sdk and data-yv-theme attributes for CSS styling
  - Pass theme prop from BibleReader to BibleTextView
  - Add yv:bg-background wrapper to all BibleTextView Storybook stories
  - Rename prop from 'background' to 'theme' for semantic clarity

## 1.5.1

### Patch Changes

- d0d596c: feat(ui): update Bible version picker to fit container bounds

## 1.5.0

### Minor Changes

- 6ff47de: feat(core): add pagination to the getVersions endpoint
  - update tests to ensure that proper amount of responses are returned
    based on the page_size query param.
  - add the ability to specify a page_size to fetch a specific number of
    items at a time.

## 1.4.0

### Minor Changes

- 8275a27: feat(ui): add bible reader settings
  - refactor popover component to have consistent styling across
    multiple components and reduce duplication in code.
  - add bible reader settings and save the users settings to localStorage.

## 1.3.0

### Minor Changes

- b2b86c2: Add support for array query parameters in API client and improve language range handling
  - **API Client**: Enhanced query string serialization to support array parameters, properly formatting them as repeated keys (e.g., `?param=one&param=two`)
  - **Bible Client**: Updated `getVersions()` method to accept either a single language range string or an array of language ranges, providing more flexibility for filtering Bible versions
  - **Schema**: Renamed language range schema to use plural naming convention for consistency
  - **Testing**: Added comprehensive test coverage for query string building with both scalar and array parameters

  This change maintains backward compatibility while providing more flexible API parameter handling.

## 1.2.1

### Patch Changes

- e845974: fix: make country parameter optional for getLanguages

  The country parameter is now optional when fetching languages, allowing developers to retrieve all available languages without filtering by country. This improves developer experience by providing a more flexible API while maintaining backward compatibility for existing code that provides a country filter.

## 1.2.0

### Minor Changes

- a8a5dd7: feat: Add intro metadata to BibleBook
  - Added optional `intro` field to BibleBook schema for retrieving book introduction metadata
  - The intro field includes `id`, `passage_id`, and `title` properties when available
  - Simplified type definitions by removing duplicate type files and using Zod schemas as single source of truth
  - Updated Bible mocks and tests to cover the new intro field

## 1.1.0

### Minor Changes

- efb1030: feat(core): make data objects that should be immutable readonly
  - changed data types that come from api responses and should not
    be mutated to be readonly.
  - See the documentation on these types, https://developers.youversion.com/sdks/react#referenced-types

## 1.0.1

### Patch Changes

- 0ae8237: fix: update version apis
  - change copyright_short -> copyright in version apis
  - change copyright_long -> promotional_content in version apis
  - add stories that hit real apis for local testing api changes

## 1.0.0

### Major Changes

- 9e53543: Public Beta 1.0 Release

## 0.11.0

### Minor Changes

- 3d37aee: feat(ui): add learn more link that takes user to bible publishers website on the bottom of the BibleReader

## 0.10.4

### Patch Changes

- 273105e: fix(ui): BibleTextView now provides footnotes when renderNotes is true

## 0.10.3

### Patch Changes

- 3a84e32: Add dark mode to the Verse of the Day component and use provider theme
  - add dark mode css to the verse of the day component
  - utilize the theme on the provider to infer the background color if one
    is not provided on components.

## 0.10.2

### Patch Changes

- 6ea85da: fix(ui): fix styling on YouVersionAuthButton and Bible App logo

## 0.10.1

### Patch Changes

- 8e3a672: fix(ui): fix the css build so that it removes our css from all layers
  - this fixes the issue where our sdk css was getting overridden due to
    the consuming app having css that is unlayered and unlayered css will
    always take precedence over layered css.

## 0.10.0

### Minor Changes

- df2082d: Added version picker functionality to BibleWidgetView component with enhanced UI theming and user experience improvements.

  New Features
  - BibleWidgetView Version Picker: Added showVersionPicker prop enabling dynamic Bible version switching within the widget
  - Enhanced Version Display: Improved version abbreviation presentation (e.g., "KJV1984" displays as "KJV" over "1984" in stacked format)
  - Auto-Scroll Navigation: Bible chapter picker now automatically scrolls to and expands the current book when opened
  - Added the ability to customize the text on the YouVersionAuthButton
  - Add theme to the YouVersionProvider to specify light or dark mode to the SDK

  UI/UX Improvements
  - Consistent Button Styling: Updated all picker buttons to use secondary variant with bold typography
  - Better Theme Support: Added comprehensive dark/light mode theming with data-yv-theme attributes
  - Improved Accessibility: Enhanced search functionality with proper ARIA labels
  - Cleaner DOM Structure: Simplified component hierarchy by removing unnecessary wrapper elements
  - Improve component theming to apply theme to the ui components and improve
    isolating the sdk css.

## 0.9.0

### Minor Changes

- e4f93b6: Update authentication system with enhanced OAuth scopes and API schema alignment

  Key Changes:
  - Added profile and email scopes to OAuth authentication
  - Updated book resource schema to match new API endpoints
  - Removed deprecated URLBuilder functionality

  Breaking Changes:
  - Book Schema: Must use the new updated book schema in any APIs returning bible book data Please enter a summary for your changes.

## 0.8.2

### Patch Changes

- 93be9ef: Update types, zod schemas, and test mocks for the following updated endpoints:
  - get bible books
  - get bible chapters
  - get bible verses

## 0.8.1

### Patch Changes

- 6a7b8ba: Upgrade to React 19.1.2 to fix a security vulnerability in React.

## 0.8.0

### Minor Changes

- 29b865d: Summary:
  Add sign-out functionality and refactor authentication system. This includes:
  - New sign-out capability on the authentication button
  - Rename the SignInButton to YouVersionAuthButton

  Breaking changes:
  - Button component now includes sign-out functionality
  - Must replace old SignInButton with YouVersionAuthButton

## 0.7.0

### Minor Changes

- b7e337d: 🔄 Authentication System Overhaul
  - Replaced old authentication strategy with new PKCE-based OAuth flow
  - Removed AuthenticationStrategy.ts and WebAuthenticationStrategy.ts
  - Added SignInWithYouVersionPKCE.ts for secure OAuth implementation
  - Enhanced Users.ts with comprehensive auth token management (+469 lines)

  🏗️ Context/Provider Architecture Refactor
  - Renamed BibleSDKContext/Provider → YouVersionContext/Provider
  - Removed UI-level YVPProvider, YVPErrorBoundary
  - Added dedicated auth providers: YouVersionAuthProvider and YouVersionAuthContext
  - Consolidated authentication logic into hooks package

  🪝 New Hooks Implementation
  - Added useYVAuth hook for authentication state management
  - Updated existing hooks (useBibleClient, useHighlights, etc.) to use new context
  - Enhanced configuration management in YouVersionPlatformConfiguration

  🔧 Infrastructure Improvements
  - Added token refresh capabilities
  - Improved memory leak prevention in auth provider
  - Enhanced type definitions and exports

  Applications using this SDK will need to:
  1. Update all context/provider imports and names
  2. Migrate from old authentication patterns to new PKCE flow
  3. Update provider setup in application roots
  4. Adjust any direct usage of removed authentication classes
  5. Update package imports for auth-related functionality

## 0.6.0

### Minor Changes

- 8518018: fix(ui)!: remove the need to export our css file

## 0.5.8

### Patch Changes

- ae9c599: chore(build): move tsup to devDependency
- ae9c599: chore(build): move tsup to devDependency

## 0.5.7

### Patch Changes

- 8b2be56: Improve sample code and readmes

## 0.5.6

### Patch Changes

- 27b32f8: Publish with NPM Token

## 0.5.5

### Patch Changes

- 752e0d5: fix(ci): remove registry-url for NPM Trusted Publishing
- 752e0d5: Use npm during the release process to support OIDC.

## 0.5.4

### Patch Changes

- 1acb93a: fix(ci): remove registry-url for NPM Trusted Publishing
- 1acb93a: Use npm during the release process to support OIDC.

## 0.5.3

### Patch Changes

- 7fd89a0: fix(ci): remove registry-url for NPM Trusted Publishing

## 0.5.2

### Patch Changes

- 2d11ab6: Publishing workflow now uses NPM Trusted Publishing instead of token publishing.

## 0.5.1

### Patch Changes

- caaf811: fix(ui): add export for BibleWidgetView

## 0.5.0

### Minor Changes

- e07208d: feat(ui): add share button to verse of the day component

## 0.4.4

### Patch Changes

- 8dee8f6: chore: allow setting apiHost from React code

## 0.4.3

### Patch Changes

- 7b652f7: chore(docs): update documentation and readmes, and env var usage

## 0.4.2

### Patch Changes

- 6764bfe: chore: permit range of React versions

## 0.4.1

### Patch Changes

- 28b10ed: Configuring initial publish workflow.
