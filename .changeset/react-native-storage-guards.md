---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Fix storage access crashing in React Native and other environments without Web Storage.

Storage was guarded with `typeof window`, which is the wrong capability check: React Native sets `global.window === global`, so the guard passed and the next line threw. Core now exports `getLocalStorage()` and `getSessionStorage()`, which return a usable store or `null`, and every storage call site in core, hooks, and UI goes through them. The helpers also cover the cases a `typeof localStorage` check misses: `localStorage` being `null` on Android DOM WebViews, Node's experimental Web Storage global evaluating to `undefined`, and browsers that throw a `SecurityError` on the property access itself.

Reads now resolve to `null` and writes no-op instead of throwing, so `@youversion/platform-core` works in React Native without an in-memory `Storage` shim. `signIn` and `handleAuthCallback`, which genuinely require persistence across the OAuth redirect, report the missing capability with a clear "requires localStorage" error instead of a bare `TypeError`.

Mutations go through the new `setStorageItem()`, `removeStorageItem()` and `clearStorage()` helpers, because a store that reads fine can still throw on write — Safari's private mode gives every origin a zero-byte quota, so `getItem` works while `setItem` throws `QuotaExceededError`. Storing a reader preference or a permission-cache entry now degrades silently there instead of crashing the caller, and post-exchange cleanup in the OAuth callback can no longer fail a sign-in whose tokens were already persisted. `signIn` still fails loudly when the verifier cannot be written, since the flow cannot complete without it.

`YouVersionPlatformConfiguration.installationId` keeps its existing contract of returning `''` when there is nowhere to persist it, so the `X-YVP-Installation-ID` header stays omitted rather than carrying a per-process value that no longer identifies an installation.
