---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Add the highlight auth flow: a color tap in BibleReader without a session or the `highlights` permission now stashes the intent and runs the two-path grant flow (YPE-1034, still behind the internal `HIGHLIGHTS_LIVE` flag).

- **Core**: new `DataExchangeClient.updateToken` (`POST /data-exchange/token`, 201 → `{ token }`, Zod-validated) plus `buildDataExchangeUrl` / `parseDataExchangeCallback` / `handleDataExchangeCallback` for the hosted just-in-time grant. Sign-in and data-exchange callbacks now parse `granted_permissions` and seed an optimistic permission cache on `YouVersionPlatformConfiguration` (`grantedPermissions`, `hasPermission`, `saveGrantedPermissions`, `removeGrantedPermission`); the cache is cleared on sign-out and a 401/403 invalidates it (server truth wins). `SignInWithYouVersionResult` gains a `permissions` field.
- **Hooks**: new `useHighlightAuthActions` exposing the one-fell-swoop sign-in (requesting `highlights`), the just-in-time data-exchange redirect, the permission-cache reads/invalidation, and the data-exchange return handler.
- **UI**: `useBibleReaderHighlights` now runs the state machine — pending highlights persist to `sessionStorage` (~10-minute expiry) to survive the redirect round-trip and apply automatically on a granted return; a just-in-time permission confirm dialog (`HighlightPermissionDialog`, copy matched to the native SDK) gates the data-exchange grant. Write failures route by status: 401/403 invalidates the cache, keeps the pending highlight, and re-prompts; 5xx/network reverts the optimistic overlay and discards. Apply/remove writes are serialized through a FIFO queue with per-verse ownership so overlapping operations settle to the last-issued state. Copy/share-only behavior when no auth provider is configured is unchanged.
