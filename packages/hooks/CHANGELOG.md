# @youversion/platform-react-hooks

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
