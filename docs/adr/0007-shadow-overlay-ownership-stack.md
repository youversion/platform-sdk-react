# ADR 0007: Model shadow-root overlays as an ownership stack

Status: Proposed (contract and executable proof selected by YPE-5355; production
runtime support not implemented)

Nested and concurrent overlays inside one component shadow root will share one
shadow-local top-layer container and register with a root-owned LIFO overlay
stack. An overlay registration identifies its stable instance, modal or
non-modal kind, parent overlay when nested, opener, and mounted phase. This
keeps stacking, focus, dismissal, inertness, and restoration behind the
`ShadowRootHost` interface instead of making each Dialog or Popover coordinate
with its siblings.

The topmost eligible mounted overlay owns interaction, focus, Escape, and
outside-click dismissal. With no modal mounted, every overlay is eligible. With
a modal mounted, eligibility is limited to the topmost modal and its descendant
chain; a later unrelated non-modal overlay remains mounted but non-interactive
until that modal unmounts. If the owner is not dismissible, dismissal attempts
do not fall through to a lower overlay. A nested overlay remains inside its
ancestor modal's focus scope. Shadow content stays inert while any modal is
mounted, including its exit animation. An ancestor close may start its own and
its descendants' exit phases together, but every descendant must unmount before
the ancestor. Focus restores only after an overlay unmounts, in this order: a
connected opener in the remaining active scope; otherwise the remaining top
eligible layer; otherwise the outer opener once the last modal leaves. A
disconnected opener is skipped in favor of the next tier.

## Scenario classification and proof

The ownership contract supports these scenarios in the committed executable
proof:

- a non-modal popover opening a modal dialog;
- a modal dialog containing a non-modal popover;
- two independent non-modal overlays; and
- closing and reopening the same modal during its exit animation.

`shadow-overlay-ownership.ts` is the deterministic state model for the
contract. Its unit tests cover the four scenarios plus modal-scope exclusion,
ancestor/descendant exit ordering, dismissal blocking during exit, and
disconnected-opener fallback. The `Shadow overlay ownership` integration story
exercises the four required scenarios in Chromium inside one real shadow root
and one native top-layer container. It verifies LIFO DOM ordering, focus and
dismissal ownership, modal inertness through exit, restoration, and stable
identity during a rapid reopen.

These scenarios remain unsupported by production SDK Dialog and Popover
callers; the proof module is internal and deliberately not connected to those
primitives. See Consequences below for what production integration requires.

## Considered options

- A shared container without ownership was rejected because independent focus
  traps can compete and unrelated overlays can escape modal inertness.
- Permanently forbidding nested and concurrent overlays was rejected because
  composite SDK surfaces such as `BibleReader` legitimately coordinate several
  dialogs and popovers.
- One native top-layer container per overlay was rejected because ownership,
  ordering, and restoration would be distributed across callers rather than
  localized at the shadow-root seam.

## Consequences

The current production active-ID sets prove lazy portal lifetime but do not
implement this contract. The executable state model reduces implementation
ambiguity but is not a production registry. Production support requires wiring
the model's rules into `ShadowRootHost`, descendant close ordering, topmost
interaction gating, modal-aware focus containment, and direct browser evidence
through the actual overlay primitives. Until that work lands, nested or
concurrent production overlays in one shadow root remain unsupported. The
contract may still be revised in response to cross-browser or
assistive-technology findings.
