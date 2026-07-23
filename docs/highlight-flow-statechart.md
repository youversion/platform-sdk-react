# BibleReader highlights flow — statechart (PR-288)

The BibleReader highlights flow is an [xstate v5](https://stately.ai/docs) state
machine: [`packages/ui/src/components/bible-reader-highlights-machine.ts`](../packages/ui/src/components/bible-reader-highlights-machine.ts).
`useBibleReaderHighlights` is a thin adapter that feeds React-owned inputs (auth,
the `HIGHLIGHTS_LIVE` flag, the fetched highlights, the scope) into the machine
as events and reads back the dialog states + the rendered verse map.

The machine is authored with `setup()` and named guards/actions/actors so it is
statically analyzable — paste the source into the [Stately visualizer](https://stately.ai/viz)
to explore it interactively.

## States and events

- **`booting`** → routes to `disabled` or `enabled` from the initial input.
- **`disabled`** — the flag is off **or** no auth provider is mounted. Fully
  inert: no fetch, no writes, no dialogs. A color tap resolves to `noop`.
- **`enabled`** — a parallel state with two independent regions:
  - **`flow`** — the auth / dialog flow.
    - `resuming` consumes the data-exchange return exactly once, then routes on
      the pending highlight + auth + permission.
    - `awaitingAuth` waits for the authenticated flip after a redirect return.
    - `idle` is interactive.
    - `signInDialog` / `permissionDialog` are the two consent dialogs.
  - **`writer`** — serialized optimistic writes. `idle → writing → checkQueue`,
    processing one queued operation at a time so a DELETE can never overtake an
    in-flight POST for the same verse.

`TAP_COLOR` forks in `flow`: authorized (`applied`) → optimistic write; signed
out → `signInDialog`; signed in without the permission → `permissionDialog`.
Both dialog paths stash a pending highlight (10-min `sessionStorage` TTL) so the
intent survives the full-page redirect and resumes on a granted return.

The stash is a **list**, not a single slot: a fresh tap replaces it, but a queued
optimistic write that loses permission (401/403) _appends_ its intent with
verse-level last-wins. Two writes queued in different colors can each 401, and
both intents must survive the re-grant — a single slot would let the second
overwrite the first. On resume, `applyPendingHighlight` re-applies every live
entry (each to its own scope, first-to-last); entries never overlap on verses.

```mermaid
stateDiagram-v2
  [*] --> booting
  booting --> disabled: flag off / no provider
  booting --> enabled: flag on & provider

  disabled --> enabled: AUTH_CHANGED (enabled)
  enabled --> disabled: AUTH_CHANGED (disabled)

  state disabled {
    note right of disabled
      TAP_COLOR → outcome "noop"
      no fetch / writes / dialogs
    end note
  }

  state enabled {
    --
    state flow {
      [*] --> resuming
      resuming --> idle: no pending
      resuming --> awaitingAuth: pending & not authed
      resuming --> idle: pending & authed & permission / applyPending
      resuming --> permissionDialog: pending & authed & no permission

      awaitingAuth --> idle: authed & permission / applyPending
      awaitingAuth --> permissionDialog: authed & no permission

      idle --> idle: TAP_COLOR authorized / optimistic write
      idle --> signInDialog: TAP_COLOR signed out / stash pending
      idle --> permissionDialog: TAP_COLOR no permission / stash pending

      signInDialog --> idle: CONFIRM_SIGN_IN / start sign-in redirect
      signInDialog --> idle: DECLINE_SIGN_IN / clear pending

      permissionDialog --> idle: CONFIRM_PERMISSION / start data-exchange
      permissionDialog --> idle: CANCEL_PERMISSION / clear pending

      idle --> permissionDialog: PERMISSION_LOST (401/403 on write)
    }
    --
    state writer {
      [*] --> w_idle
      w_idle --> writing: queue has work
      writing --> checkQueue: processWrite done / settle + shift
      checkQueue --> writing: queue has work
      checkQueue --> w_idle: queue empty
    }
  }
```

_(`ENQUEUE`, `AUTH_CHANGED`, `HIGHLIGHTS_UPDATED`, and `SCOPE_CHANGED` are handled
without leaving the current state: they update context and let the `always`
guards re-route. `HIGHLIGHTS_UPDATED` also runs the overlay reconcile.)_

## The "vapor" fix

See the "vapor" fix block comment at the top of
`packages/ui/src/components/bible-reader-highlights-machine.ts` for the root
cause, fix, and trade-off — that comment sits next to `reconcileOverlay` and is
the single source of truth for this rationale.
