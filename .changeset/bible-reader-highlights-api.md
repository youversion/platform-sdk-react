---
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

BibleReader highlights now wire to the highlights API behind an internal dark-launch flag; the localStorage highlight store is removed.

- Highlights are server-only account data (YPE-1034): the temporary `youversion-platform:highlights:<versionId>` localStorage store is deleted outright, with no migration.
- A new internal `useBibleReaderHighlights` seam fetches the current chapter's highlights via `useHighlights`, renders them through an in-memory optimistic overlay (reverted on write failure), and collapses contiguous verse selections into range USFMs (e.g. `JHN.3.16-18`) on the wire.
- Everything is gated on an internal `HIGHLIGHTS_LIVE` flag (currently off) plus an authenticated session: while off or signed out, the color row is inert — no fetches, no writes, no rendered highlights. Signing out un-renders highlights immediately.
- `@youversion/platform-react-hooks` now exports `YouVersionAuthContext`, the no-throw alternative to `useYVAuth` for components that must tolerate a missing auth provider (its error message already advertised the export).
