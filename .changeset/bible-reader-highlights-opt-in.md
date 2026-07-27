---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

**Behavior change: `BibleReader` highlights are now opt-in.** Highlights shipped enabled by default in 2.4.0. They are now off unless the host asks for them.

Migration: add `enableHighlights` to `BibleReader.Root`. Controlled-mode hosts (passing `highlights`) are unaffected and need no change.

```tsx
<BibleReader.Root defaultBook="JHN" defaultChapter="1" enableHighlights>
```

- New `BibleReader.Root` prop `enableHighlights?: boolean`, defaulting to `false`. Without it the reader renders no highlight swatch row, makes no `/v1/highlights` requests, opens no consent dialogs, and can never initiate a sign-in or data-exchange redirect from the highlight path. Verse selection, Copy, and Share are unchanged in every configuration.
- `enableHighlights` requires an auth-enabled provider (`YouVersionProvider` with `includeAuth` and `authRedirectUrl`). With both, behavior is exactly today's: fetch, optimistic paint, just-in-time consent, redirect resume, and the serialized write queue.
- Controlled mode is unchanged and ignores `enableHighlights` — passing `highlights` is itself the opt-in.
- Development-only warnings for the two ways to land in a silently dead feature: `enableHighlights` with no auth provider mounted, and `onHighlightApply` / `onHighlightRemove` passed without a `highlights` prop (they are controlled-mode only). Each warns once per reader and is silent in production builds.
