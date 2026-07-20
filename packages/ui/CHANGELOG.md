# @youversion/platform-react-ui

## 2.3.0

### Minor Changes

- ab38fb5: Surface a clear error when `YouVersionProvider` is given a missing or empty `appKey` instead of rendering a blank page. The UI provider now renders a styled "Missing app key" message, and the hooks provider throws a descriptive error for hooks-only consumers.
- fc054c6: Add `ProfileAvatar` component with initials fallback (YPE-3648). Signed-in users without a profile image now see their initials ("Cam Anderson" → "CA", "Cher" → "C") in a bordered circle instead of a broken avatar; loaded photos get a 3px gray ring per design. `BibleReader`'s user menu now uses `ProfileAvatar` for all authenticated states, and the component is exported for direct use.
- 683c123: Allow requesting YouVersion data-exchange permissions (e.g. `highlights`) at sign-in. These are intentionally not OIDC scopes: they ride alongside the standard `scope` param as repeatable `requested_permissions[]` query params on the authorize URL and are authorized via a separate per-app ACL rather than the token's scope claim.
  - `YouVersionAPIUsers.signIn(redirectURL, scopes?, permissions?)` and the underlying PKCE authorization request builder now accept a `permissions` array typed as `SignInWithYouVersionPermissionValues[]`.
  - `useYVAuth().signIn({ permissions })` forwards them from React.
  - `<YouVersionAuthButton permissions={['highlights']} />` requests them from the sign-in button.

  Scopes and permissions are separate arguments; existing calls that only pass scopes are unaffected.

- af37b90: Add a verse action popover to `BibleReader`. Tapping verses selects them (shown with an underline) and opens a popover anchored to the last-selected verse with five highlight colors, Copy, and Share. Highlights apply a translucent fill, persist to `localStorage` per Bible version (shaped like the future highlight API), and can be removed individually. Copy/Share output mirrors bible.com formatting: the verse text in curly quotes, gaps in a non-contiguous selection joined with `...`, followed by the `Book Chapter:verses VERSION` reference. Share uses the Web Share API and falls back to copying where it isn't available.

  `BibleReader` also accepts optional `onCopy` / `onShare` props. When provided, they receive the structured selection payload and suppress the default Web Share / clipboard flow, so React Native / Expo hosts can forward it across the native bridge (mirrors `VerseOfTheDay`'s `onShare`).

  Note: `BibleTextViewProps.highlightedVerses` changed from `Record<number, boolean>` to `Record<number, string>` (verse number → highlight hex). This prop was never wired into shipped usage, so no released consumer is affected; the bump stays `minor`.

### Patch Changes

- fb7ac35: Tag the `X-YVP-Sdk` header with a `-dev` suffix for non-published builds so platform telemetry can separate internal YouVersion dev-time traffic from published partner traffic.

  Published builds report the real version (`ReactSDK=2.2.0`); builds from source, dev, or tests report `ReactSDK=2.2.0-dev`. The version is stamped at build time via `YVP_PUBLISH_BUILD` (set by each package's `prepublishOnly`), and a publish guard aborts the release if an unstamped `-dev` build would ship. Published header values are otherwise unchanged, and consumers can still override `X-YVP-Sdk` via `additionalHeaders`.

- Updated dependencies [d6ab2d5]
- Updated dependencies [ab38fb5]
- Updated dependencies [683c123]
- Updated dependencies [fb7ac35]
  - @youversion/platform-core@2.3.0
  - @youversion/platform-react-hooks@2.3.0

## 2.2.0

### Minor Changes

- 2ba9e6d: Match Book/Chapter picker typography to the Figma design. `BibleChapterPicker` now uses the Aktiv Grotesk App brand font (served from the YouVersion CDN): book rows render at 16px regular and bold when expanded, chapter/intro number buttons at 16px bold, and the search input at 16px. Falls back to the default sans font if the webfont fails to load.
- 0d184fc: Update the Bible Version picker to match the latest Reader SDK Figma design, adding publisher names and refreshing the abbreviation tile.
  - `@youversion/platform-core`: New `OrganizationsClient` with `getOrganization(organizationId)` for fetching an organization by its UUID (`GET /v1/organizations/{id}`), validated against the existing `OrganizationSchema`. Design tokens use Inter (`--yv-font-sans`) and Source Serif 4 (`--yv-font-serif`); the YouVersion brand fonts (Aktiv Grotesk App / Untitled Serif) are reverted pending licensing — see `docs/adr/0001-revert-brand-fonts-pending-licensing.md`.
  - `@youversion/platform-react-hooks`: New `useOrganization(organizationId)` hook (plus `useOrganizationsClient`) following the standard `useApiData` pattern. Fetching is skipped when the id is empty. Also adds `useOrganizations(organizationIds)`, which resolves many organizations at once, deduplicated by id, so a list of versions sharing publishers only fetches each organization once.
  - `@youversion/platform-react-ui`: `BibleVersionPicker` now renders the publisher name above the version title for versions that have an `organization_id` (rows without an associated organization render the title only), and recently used versions persist `organization_id` so they display the publisher too. Publisher names are resolved once at the list level via `useOrganizations` instead of per row, avoiding N+1 requests when many versions share a publisher. The `VersionAbbreviationIcon` tile now renders as a 64px square with a 6px radius, warm-neutral (`secondary`) fill, themed border, and serif typography (Source Serif 4) using the foreground text color; recent-version and all-version rows share the same tile styling, and long or trailing-digit abbreviations (e.g. `NASB1995` → `NASB` / `1995`) stay readable without overflowing. Brand fonts (Aktiv Grotesk App / Untitled Serif) are reverted to Inter / Source Serif 4 pending licensing; the brand-font implementation is parked on branch `feat/youversion-brand-fonts`.

- ed9eb23: Add language search to `BibleVersionPicker`. The language panel now includes a bottom search input that globally filters available languages, shows a no-results empty state, and clears when the panel or popover closes.

### Patch Changes

- Updated dependencies [0d184fc]
  - @youversion/platform-core@2.2.0
  - @youversion/platform-react-hooks@2.2.0

## 2.1.0

### Minor Changes

- 5b40719: Add a cycling line spacing setting to BibleReader

  The Bible theme settings panel now includes a line spacing control that cycles
  through three presets (small `1.45`, default `1.7`, large `2.0`) on each press.
  The selection persists to `localStorage` when uncontrolled.

  `BibleReader.Root` gains `lineSpacing`, `defaultLineSpacing`, and
  `onChangeLineSpacing` props for controlled/uncontrolled usage. The existing
  `lineHeight` prop is deprecated but still honored as the initial line spacing,
  so this change is backward compatible; it will be removed in the next major.

### Patch Changes

- f2c83cf: VerseOfTheDay now shows the Bible reference directly under the "Verse of the Day" label in foreground text instead of below the verse body. BibleCard and VerseOfTheDay no longer display inline verse numbers in passage text.
  - @youversion/platform-core@2.1.0
  - @youversion/platform-react-hooks@2.1.0

## 2.0.1

### Patch Changes

- dd83b33: BibleReader now keeps the previous chapter's text on screen while the next chapter loads, dimming it and floating a spinner over it (after a short delay) instead of pulsing stale text or flashing a blank spinner. Fast/cached chapter switches stay instant, the scroll position resets to the top on chapter change, and the `useDelayedLoading` helper is shared with BibleCard. No changes to BibleTextView.
  - @youversion/platform-core@2.0.1
  - @youversion/platform-react-hooks@2.0.1

## 2.0.0

### Major Changes

- b8309a4: Stop persisting the ID token and harden the auth flow against stale/exposed state.

  The ID token is now decoded once at sign-in to derive the user profile and then
  discarded — only the decoded profile is persisted (validated with Zod on read),
  so it survives reloads without keeping the signed token in `localStorage`. The
  stored profile is cleared on sign-out and when a session expires and cannot be
  refreshed.

  Additional hardening:
  - The raw ID token is no longer attached to the sign-in result. It is decoded
    transiently at sign-in to derive the profile and then discarded, so callback
    consumers can no longer read it from memory.
  - `YouVersionAPIUsers.getStoredUserInfo()` now returns `null` when the persisted
    profile has no `id`, so a tampered or empty stored profile cannot present as a
    signed-in user with an empty profile.
  - `YouVersionAPIUsers.handleAuthCallback()` now clears persisted tokens and the
    stored profile if an error is thrown after they were written, so a failed
    callback cannot leave the user looking authenticated.

  **Breaking changes:**
  - `AuthenticationState.idToken` has been removed. Components that read
    `auth.idToken` from `useYVAuth()` should no longer rely on it; use `userInfo`
    for profile data.
  - `SignInWithYouVersionResult.idToken` has been removed. The result returned by
    `handleAuthCallback()` (and `processCallback()` in `useYVAuth`) no longer
    exposes the ID token; use `userInfo`/`yvpUserId` for profile data.
  - `YouVersionPlatformConfiguration.saveAuthData(accessToken, refreshToken, expiryDate)`
    no longer accepts an `idToken` argument.
  - `YouVersionPlatformConfiguration.idToken` getter has been removed. The decoded
    profile is available via `YouVersionPlatformConfiguration.storedUserInfo` (or
    `YouVersionAPIUsers.getStoredUserInfo()`).
  - `YouVersionAPIUsers.refreshTokens()` no longer requires a stored ID token.

- 52aa3b4: Remove deprecated APIs and tighten `BibleIndex` types (breaking changes).

  This major release removes APIs that were previously marked `@deprecated`, plus one type-only tightening. Migration steps below.

  **1. `YouVersionAuthButton` — removed the `redirectUrl` prop**

  Set the OAuth callback URL once on the provider instead. The per-call `signIn({ redirectUrl })` escape hatch in `useYVAuth` is unchanged.

  ```diff
  - <YouVersionProvider appKey="...">
  -   <YouVersionAuthButton redirectUrl="https://myapp.com/callback" />
  + <YouVersionProvider appKey="..." authRedirectUrl="https://myapp.com/callback">
  +   <YouVersionAuthButton />
    </YouVersionProvider>
  ```

  **2. `BibleWidgetView` — removed**

  The deprecated alias is gone. Use `BibleCard` / `BibleCardProps` (same component, renamed).

  ```diff
  - import { BibleWidgetView, type BibleWidgetViewProps } from '@youversion/platform-react-ui';
  + import { BibleCard, type BibleCardProps } from '@youversion/platform-react-ui';
  ```

  **3. Unused hooks and contexts — removed**

  These had zero consumers. Removed from `@youversion/platform-react-hooks`:
  - `useInitData` — use `useVersion`, `useBook`, and `useChapter` directly.
  - `useChapterNavigation` — use `getAdjacentChapter` from `@youversion/platform-core`.
  - `useVerseSelection`, `VerseSelectionProvider`, `VerseSelectionContext` — no replacement; handle verse selection via your own props/callbacks.
  - `ReaderProvider`, `ReaderContext`, `useReaderContext` — no replacement.
  - `DEFAULT` (the `{ VERSION, BOOK, CHAPTER }` constant exported alongside `useInitData`) was removed with it. If you relied on it, inline the values or use `DEFAULT_LICENSE_FREE_BIBLE_VERSION` from `@youversion/platform-core` for the version.

  **4. `BibleIndex` — `passage_id` is now required**

  `passage_id` on `BibleIndexChapter` and `BibleIndexVerse` is no longer optional. The API has always returned it; the Zod schema now enforces this at runtime as well, so consumers who relied on the optional field in mock/fixture objects must add `passage_id` to any such literals. `BibleIndexBook.intro` remains optional.

### Patch Changes

- Updated dependencies [b8309a4]
- Updated dependencies [52aa3b4]
- Updated dependencies [97b9b6b]
  - @youversion/platform-core@2.0.0
  - @youversion/platform-react-hooks@2.0.0

## 1.32.0

### Patch Changes

- Updated dependencies [ead1c34]
  - @youversion/platform-core@1.32.0
  - @youversion/platform-react-hooks@1.32.0

## 1.31.0

### Minor Changes

- 789892f: Center card content within full-width BibleCard and VerseOfTheDay layouts.
- b5f42ff: Add optional `onShare` and `VerseOfTheDayShareData` to `VerseOfTheDay` for native host share flows.

### Patch Changes

- @youversion/platform-core@1.31.0
- @youversion/platform-react-hooks@1.31.0

## 1.30.0

### Minor Changes

- 3758009: Add optional `onFootnotePress` callback to `BibleCard` for custom footnote handling (same pattern as `BibleReader`).
- 02c2330: Add `X-YVP-Sdk` header to every API call and let consumers override headers
  - New `X-YVP-Sdk: ReactSDK={version}` header sent on every request alongside `X-YVP-App-Key`. The version is imported directly from `packages/core/package.json` and inlined by the bundler at build time.
  - `SDK_VERSION`, `SDK_NAME`, and `SDK_VERSION_HEADER_NAME` exported from `@youversion/platform-core`.
  - `ApiConfig` gains an optional `additionalHeaders` map that is merged into every request. Keys here override the SDK's built-in headers, so wrappers (e.g. the React Native Expo SDK) can replace `X-YVP-Sdk` with their own identifier.
  - `YouVersionProvider` gains an `additionalHeaders` prop that flows through context to every hook-built `ApiClient`.

### Patch Changes

- Updated dependencies [02c2330]
  - @youversion/platform-core@1.30.0
  - @youversion/platform-react-hooks@1.30.0

## 1.29.0

### Minor Changes

- 8b5bf45: Add `onVersionPickerPress` escape-hatch prop to `BibleReader.Root` and `BibleCard`, and make `BibleCard.versionId` controllable.
  - `BibleReader.Root` accepts `onVersionPickerPress?: (data: BibleVersionPickerPressData) => void`, threaded through context to Toolbar and then to the internal `BibleVersionPicker.Root` — suppresses the default popover when provided
  - `BibleCard` accepts `onVersionPickerPress`, `defaultVersionId`, and `onVersionChange`; `versionId` is now optional and uses `useControllableState` for controlled/uncontrolled support
  - `BibleVersionPicker.Root` guards `isPopoverOpen` state when escape hatch is active, moves `filteredRecentVersions` to context to eliminate duplication between `Content` and `BibleVersionPickerLanguageTrigger`
  - `BibleChapterPicker.Root` guards `isPopoverOpen` state when `onChapterPickerPress` is active
  - `BibleWidgetView` kept as a deprecated alias for `BibleCard`
  - `BibleVersionPickerPressData` type exported: `{ versionId: number; languageId: string }`

### Patch Changes

- @youversion/platform-core@1.29.0
- @youversion/platform-react-hooks@1.29.0

## 1.28.0

### Minor Changes

- 0286f7f: Add `onSelect` callback to `BibleChapterPicker.Content` and `onChapterPickerPress` to `BibleReader.Root`
  - `BibleChapterPickerSelectData` type exported for `onSelect` payload
  - `onSelect` prop on `Content` fires after internal state updates, before `onRequestClose`
  - `onChapterPickerPress` prop on `BibleReader.Root` threaded through context to `Toolbar`, suppressing default popover when provided

### Patch Changes

- @youversion/platform-core@1.28.0
- @youversion/platform-react-hooks@1.28.0

## 1.27.0

### Minor Changes

- 8ba253e: Replace module-level injectStyles() side effect with React 19 style precedence hoisting via YouVersionProvider. Add static CSS export at @youversion/platform-react-ui/styles.css for non-React consumers.

### Patch Changes

- Updated dependencies [8ba253e]
  - @youversion/platform-core@1.27.0
  - @youversion/platform-react-hooks@1.27.0

## 1.26.1

### Patch Changes

- c1b9968: Fixed a UI bug on the `BibleVersionPicker` component where switching to the language picker view would result in the scrollable contents overflowing off of the view container.
  - @youversion/platform-core@1.26.1
  - @youversion/platform-react-hooks@1.26.1

## 1.26.0

### Minor Changes

- 7a0a468: Add advanced Bible version picker composition surfaces for Expo DOM integrations.
- d77c19e: Expose `BibleThemeSettingsContent` and add optional `onOpenBibleThemeSettings` on `BibleReader.Toolbar` with a **serializable** `BibleThemeSettingsSnapshot` payload for Expo DOM hosts. Export `BIBLE_READER_FONT`, `clampBibleReaderFontSize`, `nextBibleReaderFontSizeUp`, and `nextBibleReaderFontSizeDown` so native can apply edits without closure payloads. Add optional controlled typography on `BibleReader.Root` via `fontSize`/`fontFamily` with `onFontSizeChange`/`onFontFamilyChange` (and `defaultFontSize` / `defaultFontFamily` for defaults).

### Patch Changes

- @youversion/platform-core@1.26.0
- @youversion/platform-react-hooks@1.26.0

## 1.25.0

### Minor Changes

- e5a8681: Export `BibleChapterPicker.Content` for standalone rendering and add `onChapterPickerPress` to intercept trigger presses (e.g. to render picker content in a native bottom sheet instead of a popover).

### Patch Changes

- @youversion/platform-core@1.25.0
- @youversion/platform-react-hooks@1.25.0

## 1.24.0

### Minor Changes

- 2d26bf0: Add `onFootnotePress` callback prop to `BibleTextView`, `Verse.Html`, and `BibleReader.Root`. When provided, suppresses the Radix popover and calls the callback with a serializable `FootnoteData` payload. Export `FootnoteContent` component for rendering footnote data standalone (e.g. inside an Expo DOM component). Exports new `FootnoteData` and `FootnoteContentProps` types.

### Patch Changes

- @youversion/platform-core@1.24.0
- @youversion/platform-react-hooks@1.24.0

## 1.23.2

### Patch Changes

- Updated dependencies [da88c10]
  - @youversion/platform-core@1.23.2
  - @youversion/platform-react-hooks@1.23.2

## 1.23.1

### Patch Changes

- Updated dependencies [48a86d2]
  - @youversion/platform-core@1.23.1
  - @youversion/platform-react-hooks@1.23.1

## 1.23.0

### Minor Changes

- ad87585: Add i18next internationalization support with one extractable string ("Verse of The Day"). Adds i18next and react-i18next as dependencies. The SDK creates an isolated i18next instance (no global singleton mutation) and falls back to English by default.

### Patch Changes

- fda3609: fix(ui): preserve API order for suggested languages in BibleVersionPicker
- c47ab70: chore(ui): upgrade Storybook to 10.3.5 and bump MSW deps
- Updated dependencies [ad87585]
- Updated dependencies [fda3609]
- Updated dependencies [c47ab70]
  - @youversion/platform-core@1.23.0
  - @youversion/platform-react-hooks@1.23.0

## 1.22.3

### Patch Changes

- 7eaf380: Fixed some UI bugs that caused the Bible Reader toolbar and its popovers to overflow past the width of the screen on mobile.
- Updated dependencies [7eaf380]
  - @youversion/platform-core@1.22.3
  - @youversion/platform-react-hooks@1.22.3

## 1.22.2

### Patch Changes

- 203a28b: fix(ui): show specific Bible passage error messages
- Updated dependencies [203a28b]
  - @youversion/platform-react-hooks@1.22.2
  - @youversion/platform-core@1.22.2

## 1.22.1

### Patch Changes

- b8b5cf0: Fixed hooks package bundling to produce proper CJS and ESM outputs, resolving import failures in strict ESM runtimes like Deno.
- 2a64020: Updated the Bible App logo on the BibleCard and VerseOfTheDay React components to the latest designs.
- Updated dependencies [b8b5cf0]
- Updated dependencies [2a64020]
  - @youversion/platform-react-hooks@1.22.1
  - @youversion/platform-core@1.22.1

## 1.22.0

### Minor Changes

- ff14f28: We've moved our theme, fonts, and Bible CSS from the React package into our core JS package to make it more framework agnostic so that consumers using any web framework can include our CSS without the React peer dependency.

### Patch Changes

- Updated dependencies [ff14f28]
  - @youversion/platform-react-hooks@1.22.0
  - @youversion/platform-core@1.22.0

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

### Patch Changes

- Updated dependencies [87ad436]
  - @youversion/platform-core@1.21.0
  - @youversion/platform-react-hooks@1.21.0

## 1.20.2

### Patch Changes

- dd52fbe: fix: use spinner icon instead of "Loading..." text in Bible version button
- Updated dependencies [dd52fbe]
  - @youversion/platform-react-hooks@1.20.2
  - @youversion/platform-core@1.20.2

## 1.20.1

### Patch Changes

- e895fd0: Remove shadow from VerseOfTheDay card, add loading spinner with animated height transition, and match width approach to BibleCard for consistency.

  Replaced Verse.HTML in the VerseOfTheDay component with BibleTextView in favor of the baked-in error state when a Bible Verse cannot load for any reason.

  BibleTextView now is now a forwardRef component, enabling users to pass in a React ref.

- Updated dependencies [e895fd0]
  - @youversion/platform-core@1.20.1
  - @youversion/platform-react-hooks@1.20.1

## 1.20.0

### Minor Changes

- bcfb868: Fix SDK styles overriding consumer app CSS by wrapping all styles in custom @layer directives (yv-sdk-\*). Declares Tailwind v4's standard layer names (theme, base, components, utilities) before SDK layers to establish cascade priority: consumer Tailwind layers < SDK layers < consumer unlayered CSS. This prevents SDK resets and utilities from bleeding into consumer apps while protecting SDK components from consumer Tailwind styles.

  Fixed a styling bug in the BibleReader.Toolbar when the user is signed in, so that the avatar button is circular versus oblong.

  Fixed the BibleReader.Toolbar's popover button for sign in and sign out to respect dark/light modes and to close the popover when clicked.

### Patch Changes

- Updated dependencies [bcfb868]
  - @youversion/platform-core@1.20.0
  - @youversion/platform-react-hooks@1.20.0

## 1.19.0

### Minor Changes

- 030e297: Deprecates hooks and providers that are not used by the UI package or any known consumers. These were inherited from a hackathon project and never adopted. These will be fully removed in the next major version bump.

  Deprecated:
  - `useInitData` — convenience wrapper over `useVersion`, `useBook`, `useChapter` that loses error granularity, drops `refetch`, and has zero consumers. Use the three hooks directly.
  - `useChapterNavigation` — coupled to `ReaderProvider` which nobody uses. The UI package calls `getAdjacentChapter` from core directly.
  - `ReaderProvider`, `ReaderContext`, `useReaderContext` — the UI package built its own `BibleReaderContext` instead. Zero consumers.
  - `VerseSelectionProvider`, `VerseSelectionContext`, `useVerseSelection` — the UI package handles verse selection via props/callbacks. Zero consumers.

### Patch Changes

- Updated dependencies [030e297]
  - @youversion/platform-react-hooks@1.19.0
  - @youversion/platform-core@1.19.0

## 1.18.1

### Patch Changes

- 325dff9: BibleCard now animates content height transitions when loading new data instead of flashing and abruptly resizing
- Updated dependencies [325dff9]
  - @youversion/platform-react-hooks@1.18.1
  - @youversion/platform-core@1.18.1

## 1.18.0

### Minor Changes

- b8c6e1b: In our BibleCard component, we've added an error UI to make it more clear when an error has occurred fetching the Bible verse.

### Patch Changes

- Updated dependencies [b8c6e1b]
  - @youversion/platform-core@1.18.0
  - @youversion/platform-react-hooks@1.18.0

## 1.17.1

### Patch Changes

- a7100fd: We've added support for footnotes in Bible book introduction chapters. This is a rare occurance, but an example can be found in Joshua's introduction chapter when using the TPT Bible Version
- Updated dependencies [a7100fd]
  - @youversion/platform-core@1.17.1
  - @youversion/platform-react-hooks@1.17.1

## 1.17.0

### Minor Changes

- c3d673e: added error ui for faild verses

### Patch Changes

- a5f91bf: Add cross-book chapter navigation to Bible Reader toolbar with prev/next buttons, intro chapter support, and accessible aria-labels
- Updated dependencies [a5f91bf]
- Updated dependencies [c3d673e]
  - @youversion/platform-core@1.17.0
  - @youversion/platform-react-hooks@1.17.0

## 1.16.0

### Minor Changes

- 1c9d542: We've added support for rendering Bible introduction chapters (e.g., JHN.INTRO) in the Bible Reader component

### Patch Changes

- Updated dependencies [1c9d542]
  - @youversion/platform-core@1.16.0
  - @youversion/platform-react-hooks@1.16.0

## 1.15.2

### Patch Changes

- aa31bd7: Fixed a styling bug on the BibleReader.Toolbar component. When auth was disabled in the YouVersionProvider, then it caused a layout issue on the toolbar.
- Updated dependencies [aa31bd7]
  - @youversion/platform-core@1.15.2
  - @youversion/platform-react-hooks@1.15.2

## 1.15.1

### Patch Changes

- c030f6c: fix mixed font family in footnotes popover
- Updated dependencies [c030f6c]
  - @youversion/platform-core@1.15.1
  - @youversion/platform-react-hooks@1.15.1

## 1.15.0

### Minor Changes

- 0fb1d86: Rename `BibleWidgetView` to `BibleCard`. The old `BibleWidgetView` component and `BibleWidgetViewProps` type are still exported but marked as `@deprecated` and will be removed in a future major version.

### Patch Changes

- b8aedbb: Fix Bible Version Picker search input retaining stale text after selecting a version or closing the popover. Search state now resets on version selection and on popover close.
- Updated dependencies [b8aedbb]
- Updated dependencies [0fb1d86]
  - @youversion/platform-core@1.15.0
  - @youversion/platform-react-hooks@1.15.0

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

- Updated dependencies [60cffb9]
- Updated dependencies [3e1c3dc]
  - @youversion/platform-core@1.14.4
  - @youversion/platform-react-hooks@1.14.4

## 1.14.3

### Patch Changes

- ee7a69b: Fix Tailwind preflight CSS leaking globally into consumer apps. The unscoped `@import 'tailwindcss/preflight.css'` was resetting styles on all elements (h1–h6 font size/weight, margins, padding, list styles, etc.) across the entire page. Preflight resets are now scoped to `[data-yv-sdk]` so they only apply inside SDK components.
- Updated dependencies [ee7a69b]
  - @youversion/platform-core@1.14.3
  - @youversion/platform-react-hooks@1.14.3

## 1.14.2

### Patch Changes

- 0987b6c: This change fixes a bug where the serif font failed to render properly in the Bible reader.
- Updated dependencies [0987b6c]
  - @youversion/platform-core@1.14.2
  - @youversion/platform-react-hooks@1.14.2

## 1.14.1

### Patch Changes

- 51d97e5: Standardized our default Bible Version to one that does not require opt-in license to use, so that our components work out of the box by default
- Updated dependencies [51d97e5]
  - @youversion/platform-react-hooks@1.14.1
  - @youversion/platform-core@1.14.1

## 1.14.0

### Minor Changes

- 2d2c597: Added 'system' as an option to YouVersionProvider theme prop that resolves via `prefers-color-scheme` with live OS change listener

### Patch Changes

- Updated dependencies [2d2c597]
  - @youversion/platform-react-hooks@1.14.0
  - @youversion/platform-core@1.14.0

## 1.13.0

### Minor Changes

- d5579d5: Add suggested languages to Bible version picker
  - Auto-detect user's preferred language from browser settings instead of defaulting to English
  - Display suggested languages based on available Bible versions and user locale
  - Fetch complete language data with display names for better internationalization
  - Add integration tests and Storybook stories for suggested languages functionality

### Patch Changes

- Updated dependencies [d5579d5]
  - @youversion/platform-react-hooks@1.13.0
  - @youversion/platform-core@1.13.0

## 1.12.2

### Patch Changes

- ad912db: Fix broken bible reader when auth is disabled.
- Updated dependencies [ad912db]
  - @youversion/platform-react-hooks@1.12.2
  - @youversion/platform-core@1.12.2

## 1.12.1

### Patch Changes

- 165feca: Fix user settings from localStorage not loading in the bible reader
- Updated dependencies [165feca]
  - @youversion/platform-core@1.12.1
  - @youversion/platform-react-hooks@1.12.1

## 1.12.0

### Minor Changes

- 1bafe50: Add all_available and fields parameters to getVersions api call in core package and useVersions in hooks package.

### Patch Changes

- Updated dependencies [1bafe50]
  - @youversion/platform-react-hooks@1.12.0
  - @youversion/platform-core@1.12.0

## 1.11.0

### Minor Changes

- a3efcc9: Add fields query param to the getLanguages api in core package

### Patch Changes

- Updated dependencies [a3efcc9]
  - @youversion/platform-react-hooks@1.11.0
  - @youversion/platform-core@1.11.0

## 1.10.0

### Minor Changes

- ce3e92e: This PR adds verse selection and highlighting to the Bible reader component, preparing the way for highlights. It also includes infrastructure fixes for Storybook test stability in CI.

### Patch Changes

- Updated dependencies [ce3e92e]
  - @youversion/platform-react-hooks@1.10.0
  - @youversion/platform-core@1.10.0

## 1.9.2

### Patch Changes

- d7fb66a: Replace lucide-react icons dependency with custom SVG icon components to reduce the size of our platform-react-ui bundle
- Updated dependencies [d7fb66a]
  - @youversion/platform-core@1.9.2
  - @youversion/platform-react-hooks@1.9.2

## 1.9.1

### Patch Changes

- b4da78d: YouVersionAuthButton redirectUrl prop is now optional.
- Updated dependencies [b4da78d]
  - @youversion/platform-core@1.9.1
  - @youversion/platform-react-hooks@1.9.1

## 1.9.0

### Minor Changes

- d4b0071: feat(hooks): Add useLanguage hook to retrieve a language from api

### Patch Changes

- Updated dependencies [d4b0071]
  - @youversion/platform-react-hooks@1.9.0
  - @youversion/platform-core@1.9.0

## 1.8.1

### Patch Changes

- 607be3c: Refactor verse HTML transformation to support verse-level highlighting. Extract HTML processing logic to `verse-html-utils.ts` with new `wrapVerseContent()` function that wraps verse content in CSS-targetable `<span class="yv-v">` elements. Simplify footnote extraction using wrapped verse structure. Remove CSS rule preventing text wrapping. Add comprehensive test coverage for verse wrapping behavior.
- Updated dependencies [607be3c]
  - @youversion/platform-core@1.8.1
  - @youversion/platform-react-hooks@1.8.1

## 1.8.0

### Minor Changes

- 45516c2: Add recently used versions to the Bible Version Picker
  - Display up to 3 recently selected Bible versions at the top of the picker
  - Persist recent version selections in localStorage
  - Recent versions are searchable and excluded from the main "All Versions" list

### Patch Changes

- Updated dependencies [45516c2]
  - @youversion/platform-react-hooks@1.8.0
  - @youversion/platform-core@1.8.0

## 1.7.0

### Minor Changes

- a3e357e: feat(ui, hook): add sign in/out to bible reader
  - Add sign in/out functionality to the BibleReader component
  - Refactor auth hooks so redirectUri is optional (can be inferred from provider)
  - New icons: gear.tsx and person.tsx for settings/auth UI

### Patch Changes

- Updated dependencies [a3e357e]
  - @youversion/platform-react-hooks@1.7.0
  - @youversion/platform-core@1.7.0

## 1.6.2

### Patch Changes

- 694325f: Removing CSS layers approach to prevent CSS conflicts when our components are added to existing apps with global styles.
- Updated dependencies [694325f]
  - @youversion/platform-core@1.6.2
  - @youversion/platform-react-hooks@1.6.2

## 1.6.1

### Patch Changes

- 3f69494: Refactors footnotes implementation to use React portals, improves HTML sanitization, and fixes footnote popover behavior.
- Updated dependencies [3f69494]
  - @youversion/platform-react-hooks@1.6.1
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
  - @youversion/platform-react-hooks@1.6.0

## 1.5.1

### Patch Changes

- d0d596c: feat(ui): update Bible version picker to fit container bounds
- Updated dependencies [d0d596c]
  - @youversion/platform-core@1.5.1
  - @youversion/platform-react-hooks@1.5.1

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
  - @youversion/platform-react-hooks@1.5.0

## 1.4.0

### Minor Changes

- 8275a27: feat(ui): add bible reader settings
  - refactor popover component to have consistent styling across
    multiple components and reduce duplication in code.
  - add bible reader settings and save the users settings to localStorage.

### Patch Changes

- Updated dependencies [8275a27]
  - @youversion/platform-core@1.4.0
  - @youversion/platform-react-hooks@1.4.0

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
  - @youversion/platform-react-hooks@1.3.0

## 1.2.1

### Patch Changes

- e845974: fix: make country parameter optional for getLanguages

  The country parameter is now optional when fetching languages, allowing developers to retrieve all available languages without filtering by country. This improves developer experience by providing a more flexible API while maintaining backward compatibility for existing code that provides a country filter.

- Updated dependencies [e845974]
  - @youversion/platform-core@1.2.1
  - @youversion/platform-react-hooks@1.2.1

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
  - @youversion/platform-react-hooks@1.2.0

## 1.1.0

### Minor Changes

- efb1030: feat(core): make data objects that should be immutable readonly
  - changed data types that come from api responses and should not
    be mutated to be readonly.
  - See the documentation on these types, https://developers.youversion.com/sdks/react#referenced-types

### Patch Changes

- Updated dependencies [efb1030]
  - @youversion/platform-core@1.1.0
  - @youversion/platform-react-hooks@1.1.0

## 1.0.1

### Patch Changes

- 0ae8237: fix: update version apis
  - change copyright_short -> copyright in version apis
  - change copyright_long -> promotional_content in version apis
  - add stories that hit real apis for local testing api changes

- Updated dependencies [0ae8237]
  - @youversion/platform-react-hooks@1.0.1
  - @youversion/platform-core@1.0.1

## 1.0.0

### Major Changes

- 9e53543: Public Beta 1.0 Release

### Patch Changes

- Updated dependencies [9e53543]
  - @youversion/platform-react-hooks@1.0.0
  - @youversion/platform-core@1.0.0

## 0.11.0

### Minor Changes

- 3d37aee: feat(ui): add learn more link that takes user to bible publishers website on the bottom of the BibleReader

### Patch Changes

- Updated dependencies [3d37aee]
  - @youversion/platform-core@0.11.0
  - @youversion/platform-react-hooks@0.11.0

## 0.10.4

### Patch Changes

- 273105e: fix(ui): BibleTextView now provides footnotes when renderNotes is true
- Updated dependencies [273105e]
  - @youversion/platform-react-hooks@0.10.4
  - @youversion/platform-core@0.10.4

## 0.10.3

### Patch Changes

- 3a84e32: Add dark mode to the Verse of the Day component and use provider theme
  - add dark mode css to the verse of the day component
  - utilize the theme on the provider to infer the background color if one
    is not provided on components.

- Updated dependencies [3a84e32]
  - @youversion/platform-core@0.10.3
  - @youversion/platform-react-hooks@0.10.3

## 0.10.2

### Patch Changes

- 6ea85da: fix(ui): fix styling on YouVersionAuthButton and Bible App logo
- Updated dependencies [6ea85da]
  - @youversion/platform-core@0.10.2
  - @youversion/platform-react-hooks@0.10.2

## 0.10.1

### Patch Changes

- 8e3a672: fix(ui): fix the css build so that it removes our css from all layers
  - this fixes the issue where our sdk css was getting overridden due to
    the consuming app having css that is unlayered and unlayered css will
    always take precedence over layered css.

- Updated dependencies [8e3a672]
  - @youversion/platform-core@0.10.1
  - @youversion/platform-react-hooks@0.10.1

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
  - @youversion/platform-react-hooks@0.10.0
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
  - @youversion/platform-react-hooks@0.9.0
  - @youversion/platform-core@0.9.0

## 0.8.2

### Patch Changes

- 93be9ef: Update types, zod schemas, and test mocks for the following updated endpoints:
  - get bible books
  - get bible chapters
  - get bible verses
- Updated dependencies [93be9ef]
  - @youversion/platform-core@0.8.2
  - @youversion/platform-react-hooks@0.8.2

## 0.8.1

### Patch Changes

- 6a7b8ba: Upgrade to React 19.1.2 to fix a security vulnerability in React.
- Updated dependencies [6a7b8ba]
  - @youversion/platform-core@0.8.1
  - @youversion/platform-react-hooks@0.8.1

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
  - @youversion/platform-react-hooks@0.8.0
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
  - @youversion/platform-react-hooks@0.7.0
  - @youversion/platform-core@0.7.0

## 0.6.0

### Minor Changes

- 8518018: fix(ui)!: remove the need to export our css file

### Patch Changes

- Updated dependencies [8518018]
  - @youversion/platform-core@0.6.0
  - @youversion/platform-react-hooks@0.6.0

## 0.5.8

### Patch Changes

- ae9c599: chore(build): move tsup to devDependency
- Updated dependencies [ae9c599]
- Updated dependencies [ae9c599]
  - @youversion/platform-core@0.5.8
  - @youversion/platform-react-hooks@0.5.8

## 0.5.7

### Patch Changes

- 8b2be56: Improve sample code and readmes
- Updated dependencies [8b2be56]
  - @youversion/platform-react-hooks@0.5.7
  - @youversion/platform-core@0.5.7

## 0.5.6

### Patch Changes

- 27b32f8: Publish with NPM Token
- Updated dependencies [27b32f8]
  - @youversion/platform-core@0.5.6
  - @youversion/platform-react-hooks@0.5.6

## 0.5.5

### Patch Changes

- 752e0d5: fix(ci): remove registry-url for NPM Trusted Publishing
- 752e0d5: Use npm during the release process to support OIDC.
- Updated dependencies [752e0d5]
- Updated dependencies [752e0d5]
  - @youversion/platform-react-hooks@0.5.5
  - @youversion/platform-core@0.5.5

## 0.5.4

### Patch Changes

- 1acb93a: fix(ci): remove registry-url for NPM Trusted Publishing
- 1acb93a: Use npm during the release process to support OIDC.
- Updated dependencies [1acb93a]
- Updated dependencies [1acb93a]
  - @youversion/platform-react-hooks@0.5.4
  - @youversion/platform-core@0.5.4

## 0.5.3

### Patch Changes

- 7fd89a0: fix(ci): remove registry-url for NPM Trusted Publishing
- Updated dependencies [7fd89a0]
  - @youversion/platform-react-hooks@0.5.3
  - @youversion/platform-core@0.5.3

## 0.5.2

### Patch Changes

- 2d11ab6: Publishing workflow now uses NPM Trusted Publishing instead of token publishing.
- Updated dependencies [2d11ab6]
  - @youversion/platform-core@0.5.2
  - @youversion/platform-react-hooks@0.5.2

## 0.5.1

### Patch Changes

- caaf811: fix(ui): add export for BibleWidgetView
- Updated dependencies [caaf811]
  - @youversion/platform-core@0.5.1
  - @youversion/platform-react-hooks@0.5.1

## 0.5.0

### Minor Changes

- e07208d: feat(ui): add share button to verse of the day component

### Patch Changes

- Updated dependencies [e07208d]
  - @youversion/platform-core@0.5.0
  - @youversion/platform-react-hooks@0.5.0

## 0.4.4

### Patch Changes

- 8dee8f6: chore: allow setting apiHost from React code
- Updated dependencies [8dee8f6]
  - @youversion/platform-core@0.4.4
  - @youversion/platform-react-hooks@0.4.4

## 0.4.3

### Patch Changes

- 7b652f7: chore(docs): update documentation and readmes, and env var usage
- Updated dependencies [7b652f7]
  - @youversion/platform-core@0.4.3
  - @youversion/platform-react-hooks@0.4.3

## 0.4.2

### Patch Changes

- 6764bfe: chore: permit range of React versions
- Updated dependencies [6764bfe]
  - @youversion/platform-react-hooks@0.4.2
  - @youversion/platform-core@0.4.2

## 0.4.1

### Patch Changes

- 28b10ed: Configuring initial publish workflow.
- Updated dependencies [28b10ed]
  - @youversion/platform-core@0.4.1
  - @youversion/platform-react-hooks@0.4.1
