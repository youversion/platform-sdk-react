---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

BibleReader highlights are now real, server-backed YouVersion highlights, with a built-in sign-in and permission flow so a reader's highlights persist to their YouVersion account.

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
- Theme-aware highlight rendering: highlight fills render at full opacity in light mode and 30 percent opacity in dark mode, matching the Swift SDK; verse numbers over dark-mode highlights render white. Highlight fills now have subtly rounded corners, with each wrapped line fragment getting its own rounded ends so a multi-line highlight no longer cuts off square at the wrap. The verse-action popover color swatches preview the real fill: in dark mode they show the same dimmed color a highlight will apply.
