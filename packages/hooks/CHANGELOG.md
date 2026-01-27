# @youversion/platform-react-hooks

## 1.8.1

### Patch Changes

- 607be3c: Refactor verse HTML transformation to support verse-level highlighting. Extract HTML processing logic to `verse-html-utils.ts` with new `wrapVerseContent()` function that wraps verse content in CSS-targetable `<span class="yv-v">` elements. Simplify footnote extraction using wrapped verse structure. Remove CSS rule preventing text wrapping. Add comprehensive test coverage for verse wrapping behavior.
- Updated dependencies [607be3c]
  - @youversion/platform-core@1.8.1

## 1.8.0

### Minor Changes

- 45516c2: Add recently used versions to the Bible Version Picker
  - Display up to 3 recently selected Bible versions at the top of the picker
  - Persist recent version selections in localStorage
  - Recent versions are searchable and excluded from the main "All Versions" list

### Patch Changes

- Updated dependencies [45516c2]
  - @youversion/platform-core@1.8.0

## 1.7.0

### Minor Changes

- a3e357e: feat(ui, hook): add sign in/out to bible reader
  - Add sign in/out functionality to the BibleReader component
  - Refactor auth hooks so redirectUri is optional (can be inferred from provider)
  - New icons: gear.tsx and person.tsx for settings/auth UI

### Patch Changes

- Updated dependencies [a3e357e]
  - @youversion/platform-core@1.7.0

## 1.6.2

### Patch Changes

- 694325f: Removing CSS layers approach to prevent CSS conflicts when our components are added to existing apps with global styles.
- Updated dependencies [694325f]
  - @youversion/platform-core@1.6.2

## 1.6.1

### Patch Changes

- 3f69494: Refactors footnotes implementation to use React portals, improves HTML sanitization, and fixes footnote popover behavior.
- Updated dependencies [3f69494]
  - @youversion/platform-core@1.6.1

## 1.6.0

### Minor Changes

- b0d9f87: feat(ui): add dark mode theme support to BibleTextView and BibleReader
  - Add theme prop (light/dark) to BibleTextView for text theme control
  - Implement theme inheritance from YouVersionProvider via useTheme hook
  - Add data-yv-sdk and data-yv-theme attributes for CSS styling
  - Pass theme prop from BibleReader to BibleTextView
  - Add yv:bg-background wrapper to all BibleTextView Storybook stories
  - Rename prop from 'background' to 'theme' for semantic clarity

### Patch Changes

- Updated dependencies [b0d9f87]
  - @youversion/platform-core@1.6.0

## 1.5.1

### Patch Changes

- d0d596c: feat(ui): update Bible version picker to fit container bounds
- Updated dependencies [d0d596c]
  - @youversion/platform-core@1.5.1

## 1.5.0

### Minor Changes

- 6ff47de: feat(core): add pagination to the getVersions endpoint
  - update tests to ensure that proper amount of responses are returned
    based on the page_size query param.
  - add the ability to specify a page_size to fetch a specific number of
    items at a time.

### Patch Changes

- Updated dependencies [6ff47de]
  - @youversion/platform-core@1.5.0

## 1.4.0

### Minor Changes

- 8275a27: feat(ui): add bible reader settings
  - refactor popover component to have consistent styling across
    multiple components and reduce duplication in code.
  - add bible reader settings and save the users settings to localStorage.

### Patch Changes

- Updated dependencies [8275a27]
  - @youversion/platform-core@1.4.0

## 1.3.0

### Minor Changes

- b2b86c2: Add support for array query parameters in API client and improve language range handling
  - **API Client**: Enhanced query string serialization to support array parameters, properly formatting them as repeated keys (e.g., `?param=one&param=two`)
  - **Bible Client**: Updated `getVersions()` method to accept either a single language range string or an array of language ranges, providing more flexibility for filtering Bible versions
  - **Schema**: Renamed language range schema to use plural naming convention for consistency
  - **Testing**: Added comprehensive test coverage for query string building with both scalar and array parameters

  This change maintains backward compatibility while providing more flexible API parameter handling.

### Patch Changes

- Updated dependencies [b2b86c2]
  - @youversion/platform-core@1.3.0

## 1.2.1

### Patch Changes

- e845974: fix: make country parameter optional for getLanguages

  The country parameter is now optional when fetching languages, allowing developers to retrieve all available languages without filtering by country. This improves developer experience by providing a more flexible API while maintaining backward compatibility for existing code that provides a country filter.

- Updated dependencies [e845974]
  - @youversion/platform-core@1.2.1

## 1.2.0

### Minor Changes

- a8a5dd7: feat: Add intro metadata to BibleBook
  - Added optional `intro` field to BibleBook schema for retrieving book introduction metadata
  - The intro field includes `id`, `passage_id`, and `title` properties when available
  - Simplified type definitions by removing duplicate type files and using Zod schemas as single source of truth
  - Updated Bible mocks and tests to cover the new intro field

### Patch Changes

- Updated dependencies [a8a5dd7]
  - @youversion/platform-core@1.2.0

## 1.1.0

### Minor Changes

- efb1030: feat(core): make data objects that should be immutable readonly
  - changed data types that come from api responses and should not
    be mutated to be readonly.
  - See the documentation on these types, https://developers.youversion.com/sdks/react#referenced-types

### Patch Changes

- Updated dependencies [efb1030]
  - @youversion/platform-core@1.1.0

## 1.0.1

### Patch Changes

- 0ae8237: fix: update version apis
  - change copyright_short -> copyright in version apis
  - change copyright_long -> promotional_content in version apis
  - add stories that hit real apis for local testing api changes

- Updated dependencies [0ae8237]
  - @youversion/platform-core@1.0.1

## 1.0.0

### Major Changes

- 9e53543: Public Beta 1.0 Release

### Patch Changes

- Updated dependencies [9e53543]
  - @youversion/platform-core@1.0.0

## 0.11.0

### Minor Changes

- 3d37aee: feat(ui): add learn more link that takes user to bible publishers website on the bottom of the BibleReader

### Patch Changes

- Updated dependencies [3d37aee]
  - @youversion/platform-core@0.11.0

## 0.10.4

### Patch Changes

- 273105e: fix(ui): BibleTextView now provides footnotes when renderNotes is true
- Updated dependencies [273105e]
  - @youversion/platform-core@0.10.4

## 0.10.3

### Patch Changes

- 3a84e32: Add dark mode to the Verse of the Day component and use provider theme
  - add dark mode css to the verse of the day component
  - utilize the theme on the provider to infer the background color if one
    is not provided on components.

- Updated dependencies [3a84e32]
  - @youversion/platform-core@0.10.3

## 0.10.2

### Patch Changes

- 6ea85da: fix(ui): fix styling on YouVersionAuthButton and Bible App logo
- Updated dependencies [6ea85da]
  - @youversion/platform-core@0.10.2

## 0.10.1

### Patch Changes

- 8e3a672: fix(ui): fix the css build so that it removes our css from all layers
  - this fixes the issue where our sdk css was getting overridden due to
    the consuming app having css that is unlayered and unlayered css will
    always take precedence over layered css.

- Updated dependencies [8e3a672]
  - @youversion/platform-core@0.10.1

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

### Patch Changes

- Updated dependencies [df2082d]
  - @youversion/platform-core@0.10.0

## 0.9.0

### Minor Changes

- e4f93b6: Update authentication system with enhanced OAuth scopes and API schema alignment

  Key Changes:
  - Added profile and email scopes to OAuth authentication
  - Updated book resource schema to match new API endpoints
  - Removed deprecated URLBuilder functionality

  Breaking Changes:
  - Book Schema: Must use the new updated book schema in any APIs returning bible book data Please enter a summary for your changes.

### Patch Changes

- Updated dependencies [e4f93b6]
  - @youversion/platform-core@0.9.0

## 0.8.2

### Patch Changes

- 93be9ef: Update types, zod schemas, and test mocks for the following updated endpoints:
  - get bible books
  - get bible chapters
  - get bible verses
- Updated dependencies [93be9ef]
  - @youversion/platform-core@0.8.2

## 0.8.1

### Patch Changes

- 6a7b8ba: Upgrade to React 19.1.2 to fix a security vulnerability in React.
- Updated dependencies [6a7b8ba]
  - @youversion/platform-core@0.8.1

## 0.8.0

### Minor Changes

- 29b865d: Summary:
  Add sign-out functionality and refactor authentication system. This includes:
  - New sign-out capability on the authentication button
  - Rename the SignInButton to YouVersionAuthButton

  Breaking changes:
  - Button component now includes sign-out functionality
  - Must replace old SignInButton with YouVersionAuthButton

### Patch Changes

- Updated dependencies [29b865d]
  - @youversion/platform-core@0.8.0

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

### Patch Changes

- Updated dependencies [b7e337d]
  - @youversion/platform-core@0.7.0

## 0.6.0

### Minor Changes

- 8518018: fix(ui)!: remove the need to export our css file

### Patch Changes

- Updated dependencies [8518018]
  - @youversion/platform-core@0.6.0

## 0.5.8

### Patch Changes

- ae9c599: chore(build): move tsup to devDependency
- Updated dependencies [ae9c599]
- Updated dependencies [ae9c599]
  - @youversion/platform-core@0.5.8

## 0.5.7

### Patch Changes

- 8b2be56: Improve sample code and readmes
- Updated dependencies [8b2be56]
  - @youversion/platform-core@0.5.7

## 0.5.6

### Patch Changes

- 27b32f8: Publish with NPM Token
- Updated dependencies [27b32f8]
  - @youversion/platform-core@0.5.6

## 0.5.5

### Patch Changes

- 752e0d5: fix(ci): remove registry-url for NPM Trusted Publishing
- 752e0d5: Use npm during the release process to support OIDC.
- Updated dependencies [752e0d5]
- Updated dependencies [752e0d5]
  - @youversion/platform-core@0.5.5

## 0.5.4

### Patch Changes

- 1acb93a: fix(ci): remove registry-url for NPM Trusted Publishing
- 1acb93a: Use npm during the release process to support OIDC.
- Updated dependencies [1acb93a]
- Updated dependencies [1acb93a]
  - @youversion/platform-core@0.5.4

## 0.5.3

### Patch Changes

- 7fd89a0: fix(ci): remove registry-url for NPM Trusted Publishing
- Updated dependencies [7fd89a0]
  - @youversion/platform-core@0.5.3

## 0.5.2

### Patch Changes

- 2d11ab6: Publishing workflow now uses NPM Trusted Publishing instead of token publishing.
- Updated dependencies [2d11ab6]
  - @youversion/platform-core@0.5.2

## 0.5.1

### Patch Changes

- caaf811: fix(ui): add export for BibleWidgetView
- Updated dependencies [caaf811]
  - @youversion/platform-core@0.5.1

## 0.5.0

### Minor Changes

- e07208d: feat(ui): add share button to verse of the day component

### Patch Changes

- Updated dependencies [e07208d]
  - @youversion/platform-core@0.5.0

## 0.4.4

### Patch Changes

- 8dee8f6: chore: allow setting apiHost from React code
- Updated dependencies [8dee8f6]
  - @youversion/platform-core@0.4.4

## 0.4.3

### Patch Changes

- 7b652f7: chore(docs): update documentation and readmes, and env var usage
- Updated dependencies [7b652f7]
  - @youversion/platform-core@0.4.3

## 0.4.2

### Patch Changes

- 6764bfe: chore: permit range of React versions
- Updated dependencies [6764bfe]
  - @youversion/platform-core@0.4.2

## 0.4.1

### Patch Changes

- 28b10ed: Configuring initial publish workflow.
- Updated dependencies [28b10ed]
  - @youversion/platform-core@0.4.1
