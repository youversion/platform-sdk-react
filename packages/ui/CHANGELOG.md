# @youversion/platform-react-ui

## 2.10.0

### Minor Changes

- c24ce71: `BibleCard` now caps its painted shell at 700px by default, or at a pixel `maxWidth`. Scripture fills that shell. Pass `maxWidth="100%"` for a full-bleed shell; that path keeps the 600px inner column, and scripture fills the column. Full-bleed hosts must pass `"100%"`. `VerseOfTheDay` and `BibleReader` are unchanged.

### Patch Changes

- @youversion/platform-core@2.10.0
- @youversion/platform-react-hooks@2.10.0

## 2.9.0

### Minor Changes

- aef57f3: Hosts can pass `locale` on `YouVersionProvider` to set SDK UI language and `Accept-Language` (including Verse of the Day copy in Expo WebViews), and `defaultLanguageId` / `languageId` on `BibleReader.Root` to seed the version picker. App locale and Bible language stay separate: `locale` does not pick a default Bible translation.

### Patch Changes

- @youversion/platform-core@2.9.0
- @youversion/platform-react-hooks@2.9.0

## 2.8.0

### Minor Changes

- 830d5d5: Add `permittedVersionIds`, `excludedVersionIds`, and `permittedLanguageTags` so apps can limit which Bible versions the SDK uses (YPE-4657).

### Patch Changes

- e9840fc: Type-aware oxlint on TypeScript 7. Data hooks skip fetch when a hook override is set, without conditional hook calls.
- 1b0c16c: Sync localization from platform-localization (0cca3f7): add Afrikaans (af), Arabic (ar), Czech (cs), Welsh (cy), German (de), Norwegian (no), Portuguese (pt), Vietnamese (vi); update 3 keys in en, ko, zh.
- Updated dependencies [e9840fc]
- Updated dependencies [830d5d5]
  - @youversion/platform-core@2.8.0
  - @youversion/platform-react-hooks@2.8.0

## 2.7.1

### Patch Changes

- Updated dependencies [4f4ce4a]
  - @youversion/platform-core@2.7.1
  - @youversion/platform-react-hooks@2.7.1

## 2.7.0

### Minor Changes

- f751b5b: `BibleTextView`, `BibleCard`, and `VerseOfTheDay` now auto-paint the signed-in user's highlights from the API when the `highlights` permission is granted. Omit the prop for that self-contained path. Passing `highlights` (including `[]`) stays controlled so React Native hosts can keep the token out of the WebView.

### Patch Changes

- @youversion/platform-core@2.7.0
- @youversion/platform-react-hooks@2.7.0

## 2.6.3

### Patch Changes

- 037de56: Replace the iOS-style box-arrow-up share glyph with a curved forward arrow in `VerseOfTheDay` and the verse action popover, so the share affordance reads as "share" on non-Apple platforms too.
  - @youversion/platform-core@2.6.3
  - @youversion/platform-react-hooks@2.6.3

## 2.6.2

### Patch Changes

- dfa94a8: Fix storage access crashing in React Native and other environments without Web Storage.

  Storage was guarded with `typeof window`, which is the wrong capability check: React Native sets `global.window === global`, so the guard passed and the next line threw. Core now exports `getLocalStorage()` and `getSessionStorage()`, which return a usable store or `null`, and every storage call site in core, hooks, and UI goes through them. The helpers also cover the cases a `typeof localStorage` check misses: `localStorage` being `null` on Android DOM WebViews, Node's experimental Web Storage global evaluating to `undefined`, and browsers that throw a `SecurityError` on the property access itself.

  Reads now resolve to `null` and writes no-op instead of throwing, so `@youversion/platform-core` works in React Native without an in-memory `Storage` shim. `signIn` and `handleAuthCallback`, which genuinely require persistence across the OAuth redirect, report the missing capability with a clear "requires localStorage" error instead of a bare `TypeError`.

  Mutations go through the new `setStorageItem()`, `removeStorageItem()` and `clearStorage()` helpers, because a store that reads fine can still throw on write — Safari's private mode gives every origin a zero-byte quota, so `getItem` works while `setItem` throws `QuotaExceededError`. Storing a reader preference or a permission-cache entry now degrades silently there instead of crashing the caller, and post-exchange cleanup in the OAuth callback can no longer fail a sign-in whose tokens were already persisted. `signIn` still fails loudly when the verifier cannot be written, since the flow cannot complete without it — as it now does for the requested-permissions stash, which is the callback's only record of what the user consented to on the web flow.

  The session itself is held to the same standard: `saveAuthData()` and `saveUserInfo()` now report whether the write landed, and `handleAuthCallback` and `refreshTokens` fail instead of reporting a sign-in whose tokens are already unreadable. Every read of the session goes back to storage, so a discarded write meant a "signed in" user whose next request would 401 and who would be signed out on reload.

  `YouVersionPlatformConfiguration.installationId` keeps its existing contract of returning `''` when there is nowhere to persist it, so the `X-YVP-Installation-ID` header stays omitted rather than carrying a per-process value that no longer identifies an installation.

- f06e86a: Paint and clear non-palette highlight colors in the web Bible reader.

  Apply stays limited to the five SDK palette colors. Valid non-palette API hex now paints on the reader and appears in the remove tray at its exact color with the checkmark. Invalid hex is dropped from paint and the tray. Clear keeps the existing ANY rule for mixed selections. Dark fills (e.g. black) flip verse text and the remove checkmark to white in light mode so they stay legible.

- Updated dependencies [dfa94a8]
  - @youversion/platform-core@2.6.2
  - @youversion/platform-react-hooks@2.6.2

## 2.6.1

### Patch Changes

- 4cae248: Fix the `BibleCard` error state announcing two alerts, and keep the version picker usable while an error is showing. The "Error" label stays in the header slot but drops its `role="alert"` and `aria-live`, leaving the message block in the card body as the only alert region. The picker no longer disappears on error, so a 404 has an in-card fix: switch to a version that carries the passage.

  The shared message block now hides its icon with `aria-hidden`, so `VerseOfTheDay` and standalone `BibleTextView` pick up that fix too. Their announcement stays polite and their visible text is unchanged, and neither gains an "Error" label. The eight status-aware messages, their six locales, and how errors are derived are untouched.
  - @youversion/platform-core@2.6.1
  - @youversion/platform-react-hooks@2.6.1

## 2.6.0

### Minor Changes

- 75b0899: Auto-transform Bible HTML in `getPassage` — verse wrapping, footnote extraction, sanitization, and table fixes now happen automatically. Consumers no longer need to call `transformBibleHtml` manually. Uses native DOMParser in browser, dynamic `import('jsdom')` on server. `jsdom` is now declared as an optional peer dependency so install logs surface it for server consumers. Added `data-yv-transformed` idempotency marker so double-transforms are a no-op. Pass `transform: false` to receive raw, untransformed HTML (useful for simple display or when `jsdom` is unavailable); `usePassage` accepts the same `transform` option and forwards it. Bible reader CSS now handles verse label spacing for untransformed HTML automatically.

### Patch Changes

- Updated dependencies [75b0899]
  - @youversion/platform-core@2.6.0
  - @youversion/platform-react-hooks@2.6.0

## 2.5.1

### Patch Changes

- 9a2b3e9: Fix secondary buttons rendering their label in the muted text color, which made active controls read as disabled. The `secondary` variant now pairs `bg-muted` with the normal foreground color in both light and dark themes. This is most visible on the BibleCard version picker button, and also affects the secondary buttons in BibleReader, BibleChapterPicker, BibleVersionPicker, and the highlight permission dialog.
- 9c2e8e4: Remove the divider lines between book rows in `BibleChapterPicker` to match the current design. Row padding and tap targets are unchanged.
- f6b98da: Sync localization from platform-localization (ac750ac): update 31 keys in es, tr.
- b592e72: Fix the version count badge in the version picker's language trigger rendering with a monospace, slashed-zero font. The badge now inherits the picker's font and keeps `tabular-nums` for stable digit widths.
  - @youversion/platform-core@2.5.1
  - @youversion/platform-react-hooks@2.5.1

## 2.5.0

### Minor Changes

- abc1877: `BibleReader` can now hand verse actions to the host (YPE-2894). Three additive changes; **every default is unchanged**, so existing consumers see identical behavior.
  - New `BibleReader.Root` prop `verseActions?: 'popover' | 'none'`. `'popover'` is the default and renders the built-in `VerseActionPopover` exactly as before. `'none'` renders no verse-action UI at all while keeping everything else intact — verses still select and paint, `onVerseSelect` still fires with `reference` and `shareData` populated, and the Copy / Share payload is still built. Highlight intents are the exception: the built-in popover is their only trigger, so `onHighlightApply` / `onHighlightRemove` do **not** fire in this mode — a host owning the action UI drives highlights by updating the `highlights` prop directly. Use it when the host owns the action UI (a React Native host presenting a native bottom sheet, where a second in-WebView popover would stack on top of it).
  - New `BibleReader.Root` prop `clearSelectionSignal?: number`. Any change to the value clears the current verse selection from outside the reader, emitting `onVerseSelect` with `verses: []`. The value at mount is the baseline, so mounting never clears. It is a counter rather than an imperative `ref` handle because Expo DOM components accept only serializable props. Needed with `verseActions="none"`, where nothing inside the reader clears the selection any more.
  - `BibleReaderVerseSelection` (the `onVerseSelect` payload) gains two fields: `reference`, the localized display reference **without** the version abbreviation (`Hebrews 11:4`, falling back to the USFM book code until `useBooks` resolves, `''` on clear), and `shareData`, the same `BibleReaderShareData` the popover's Copy / Share buttons produce (`null` on clear). `reference` and `shareData.reference` deliberately differ — copied text keeps the version (`Hebrews 11:4 BSB`), a UI label does not. When the localized book title or version abbreviation resolves while a selection is live, the reader re-emits `onVerseSelect` with the same `verses` and the refreshed fields, so a host never sticks on the fallback: treat the payload as the current state of the selection, not as one event per user action.

  `BibleReaderHighlightIntent` is unchanged: it no longer spreads the full selection type, so intents still carry identity and color only.

- 514a642: Register the Korean, Turkish, and Chinese locale bundles in the i18n resource map so browser-language detection can select them. Previously the synced bundles shipped unreferenced, and those browsers fell back to English. `pnpm check:i18n` now fails when a locale file is not registered.
- 0a1c880: Swap the SDK's serif face from Source Serif 4 to **Untitled Serif**, YouVersion's brand serif, delivered from the YouVersion Fonts API (YPE-1350, YPE-1910).
  - The serif stack is now `'Untitled Serif', 'Source Serif 4', serif` in both token declarations (`--yv-font-serif` in core, `--font-serif` in the UI theme), so every serif surface follows: BibleReader body text, the Bible card, `BibleText`, the version-picker abbreviation tile, footnotes, chapter headings, and the `lg` Verse of the Day card. Untitled Serif is named first, so a host that loads its own copy takes priority regardless of who fetched it.
  - `YouVersionProvider` now loads the font for you. It renders a hoisted `<link rel="stylesheet">` to `https://api.youversion.com/v1/fonts/1/stylesheet`, using the app key you already supply — **a new outbound request** to `api.youversion.com`, plus woff2 fetches from `cdn.youversion.com`. No new prop and no setup; there is no opt-out. No font file ships in any package.
  - **Strict CSP consumers:** allowlist `https://api.youversion.com` in `style-src` and `https://cdn.youversion.com` in `font-src`. If they are blocked, serif text falls back to Source Serif 4 (still loaded from Google Fonts) with no layout break.
  - **The BibleReader's default font changes** from Source Serif 4 to Untitled Serif, and the font picker button now reads "Untitled Serif" instead of "Source Serif". Readers whose saved preference is the old Source Serif stack are migrated on load, so the picker still shows serif as active. Any other `fontFamily` value you pass or persist is left untouched.
  - The internal `SOURCE_SERIF_FONT` constant is deprecated (retained for that migration). The picker now reads a new `untitledSerifFontName` locale key; the old `sourceSerifFontName` key is retired in a follow-up sync. Neither is part of the public API; nothing is removed or retyped.

  See `docs/adr/0004-adopt-untitled-serif-via-fonts-api.md` for the delivery rationale.

### Patch Changes

- 1da7184: Automate UI locale registration from locale JSON files via `generate:i18n`, and run generation before build, typecheck, Storybook, and test commands so new languages stay in sync without hand-editing the resource map.
- 0253e33: Fix BibleChapterPicker requiring two taps to collapse an expanded book. The book
  accordion now stays controlled for its whole lifetime instead of flipping to
  uncontrolled when a book is collapsed.
- 514a642: Sync localization from platform-localization (c9c01e1): add Korean (ko), Turkish (tr), Chinese (zh); update 1 keys in en.
- Updated dependencies [0a1c880]
  - @youversion/platform-core@2.5.0
  - @youversion/platform-react-hooks@2.5.0

## 2.4.0

### Minor Changes

- ebddf21: BibleReader gains a controlled highlights mode (YPE-3705) for hosts that own highlight data themselves (e.g. React Native / Expo DOM hosts keeping the user token out of the WebView).
  - New `BibleReader.Root` props: `highlights?: Highlight[]` (core API shape; presence puts the highlight slice in controlled mode, latched at first mount), `onVerseSelect` (both modes, fires on every selection change — `verses: []` whenever a non-empty selection clears, including after highlight/copy/share actions, popover dismiss, and navigation), and `onHighlightApply` / `onHighlightRemove` (controlled mode only; ignored in self-contained mode). Payloads are serializable, bridge-safe objects (`BibleReaderVerseSelection`, `BibleReaderHighlightIntent`) with always-per-verse `passageIds`.
  - In controlled mode the reader is a pure projection: highlights render solely from the prop (filtered by displayed version + chapter, range USFMs like `JHN.3.16-18` expanded per verse), color taps emit intents and paint nothing until the host round-trips an updated prop, and neither the highlights API nor any local store is touched. No auth surface can originate from the highlight path.
  - Self-contained behavior (no `highlights` prop) uses the server-backed `useBibleReaderHighlights` path (YPE-1034), dark-launched behind `HIGHLIGHTS_LIVE`.
  - `@youversion/platform-react-ui` now re-exports the `Highlight` type from `@youversion/platform-core`.

- 71e4c1a: BibleReader highlights are now real, server-backed YouVersion highlights, with a built-in sign-in and permission flow so a reader's highlights persist to their YouVersion account.

  **Important: previous releases accidentally shipped a demo-only, localStorage-based highlights implementation in BibleReader. It stored highlights only in the local browser and never synced to the reader's YouVersion account. That implementation has been removed and replaced by the server-backed highlights described here.** These highlights are live in this release and enabled by default.
  - Server-backed highlights in BibleReader: tap verses, pick a color, and highlights persist to the reader's YouVersion account instead of the local browser.
  - Built-in sign-in dialog and just-in-time `highlights` permission flow: a highlight tap while signed out opens a sign-in dialog; a missing `highlights` permission triggers the YouVersion data-exchange consent flow, and the pending highlight is applied automatically once consent is granted (surviving the redirect round-trip).
  - New `BibleReader` props `appName` and `signInPromptMessage` for the sign-in dialog (Swift SDK parity): `appName` names your app in the dialog, and `signInPromptMessage` shows an optional integrator pitch (hidden when unset).
  - Optimistic UI: color taps apply and remove instantly while writes settle in the background, with automatic revert on network/5xx failures and a re-prompt on auth failures (401/403).
  - Behavior change in `useHighlights`: `createHighlight` and `deleteHighlight` no longer auto-refetch. Direct consumers must now call `refetch()` themselves after their mutations settle; the BibleReader flow coordinates this for you (batching a set of verse writes into a single refetch).
  - New exports: `YouVersionAuthContext` from `@youversion/platform-react-hooks` (the no-throw alternative to `useYVAuth` for components that must tolerate a missing auth provider), and a re-export of the `Highlight` type from `@youversion/platform-react-ui`.
  - The active color swatch now shows a checkmark (24px `icons/check`) instead of an X, matching the Bible app; tapping it still removes the highlight.
  - Highlight-flow reliability fixes surfaced by staging: the previously invisible primary button in the permission dialog now uses the correct `bg-primary` / `text-primary-foreground` pairing (it resolved to white-on-white in light mode); the optimistic overlay is retired only once a refetch actually reflects the write, so highlights no longer flicker out and back under read-after-write lag; removes now send one DELETE per verse (range DELETE is unsupported by the API), while applies still collapse contiguous verses into range USFMs; and highlight fills now fade their background color (~250ms, disabled under `prefers-reduced-motion`) instead of popping in.
  - Fix: the core `ApiClient` now treats empty-body 2xx JSON responses as success with no data. Previously a successful highlight delete (a 200 with an empty body) was misread as a failure, briefly flashing the removed highlight back before it disappeared.
  - Fix: duplicate processing of the same OAuth callback (e.g. the double-invoked auth init effect under React StrictMode) can no longer clear a just-granted `highlights` permission. The code-for-token exchange is now deduped by authorization code, so a repeated callback shares the one exchange instead of firing a second request whose failure would wipe the freshly seeded grant and re-prompt for permission.
  - Fix: a one-shot `highlights` sign-in no longer re-prompts for permission when the auth server omits the grant echo. On the web flow the server returns no `granted_permissions` on the callback and no data-exchange scope on the token, so nothing seeded the permission cache and the flow immediately re-prompted after consent. The permissions requested at sign-in are now stashed (bound to the OAuth `state`) and seeded optimistically on return; the seed is self-correcting because a 401/403 on the first write drops the permission and re-prompts.
  - Fix: concurrent token refreshes (e.g. the double-invoked auth init effect under React StrictMode) now share a single in-flight refresh, so a losing duplicate can no longer spend the single-use refresh token a second time and wipe the session on its failure.
  - Fix: verse labels and footnote icons now inherit the surrounding text color over highlight fills instead of being painted with the fill color, keeping them legible on highlighted verses.
  - Theme-aware highlight rendering: highlight fills render at full opacity in light mode and 30 percent opacity in dark mode, matching the Swift SDK; verse numbers over dark-mode highlights render white. Highlight fills now have subtly rounded corners, with each wrapped line fragment getting its own rounded ends so a multi-line highlight no longer cuts off square at the wrap. The verse-action popover color swatches preview the real fill: in dark mode they show the same dimmed color a highlight will apply. Opening the popover with a mouse or touch no longer flashes a focus ring on the first swatch; keyboard navigation still shows a clearly visible focus ring.

### Patch Changes

- 05beced: Localize BibleReader font-size/line-spacing and popover close accessibility labels via i18n.
  - The YouVersion Platform logo component's accessible label is now a required prop with no hardcoded English default; the SDK's built-in usages pass localized labels.

- Updated dependencies [71e4c1a]
- Updated dependencies [71e4c1a]
  - @youversion/platform-core@2.4.0
  - @youversion/platform-react-hooks@2.4.0

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
