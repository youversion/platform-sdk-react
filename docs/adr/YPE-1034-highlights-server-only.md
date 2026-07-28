# YPE-1034 — Wire the highlights API into BibleReader

Status: **Decided** (grilling session 2026-07-10, Cam + Dustin)
Component: `packages/ui/src/components/bible-reader.tsx` (+ hooks `useHighlights`)
Inputs: July 9 2026 highlights sync (Notion: "React Web SDK Highlights:
Implementation Brief"), auth state machine doc, YPE-642 gotchas doc,
Swift reference PR platform-sdk-swift#179.

## ADR-001 — Highlights are server-only; the localStorage store is removed

**Supersedes ADR-001 in [YPE-642](./YPE-642-verse-action-popover.md).**

### Decision

The localStorage highlight store (`youversion-platform:highlights:<versionId>`)
is deleted outright — no migration, no signed-out fallback. Highlights are
fetched from and written to `/v1/highlights` exclusively, through the SDK's
authenticated session. A user with no session (or whose app lacks the
`highlights` permission) enters the highlight auth flow when they tap a color;
their intent is stashed as a **pending highlight** (sessionStorage, ~10-minute
expiry), never as a persisted local highlight.

The only local traces of highlight state are:
- the in-memory optimistic overlay while a write is in flight,
- the pending highlight during an auth round-trip,
- an optimistic localStorage cache of the *permission* grant (not highlight
  data), which the server can invalidate at any time via 401/403.

### Why

- Highlights are account data. A browser-profile copy silently diverges from
  the user's YouVersion account and dies at the browser boundary.
- YPE-642's store was explicitly a stand-in for this ticket (its ADR-001 said
  "server sync is a separate ticket" — this is that ticket).
- The SDK is pre-1.0 with few consumers; the migration code for weeks-old
  throwaway data would outlive its usefulness.
- Two persistence paths (API + local) double the state machine and create an
  unanswerable merge question on sign-in.

### Consequences

- Sign-out immediately un-renders all highlights.
- Signed-out readers see no highlights; that is correct, not a regression.
- The RN Expo / native-host story (YPE-3705) supplies highlights via
  controlled props instead — it does not resurrect local persistence.

### Alternatives rejected

- **localStorage for signed-out + API for signed-in:** merge-on-sign-in
  conflicts, doubled state machine, data that still dies per-device.
- **One-time migration of existing local highlights:** permanent code for
  transient data nobody has accumulated meaningfully.
