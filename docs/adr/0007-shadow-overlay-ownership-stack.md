# ADR 0007: Model shadow-root overlays as an ownership stack

Status: Proposed (contract selected by YPE-5355; runtime support not implemented)

Nested and concurrent overlays inside one component shadow root will share one
shadow-local top-layer container and register with a root-owned LIFO overlay
stack. An overlay registration identifies its stable instance, modal or
non-modal kind, parent overlay when nested, opener, and mounted phase. This
keeps stacking, focus, dismissal, inertness, and restoration behind the
`ShadowRootHost` interface instead of making each Dialog or Popover coordinate
with its siblings.

The topmost mounted overlay owns interaction, focus, Escape, and outside-click
dismissal. If it is not dismissible, those dismissal attempts do not fall
through to a lower overlay. A nested overlay remains inside its ancestor modal's
focus scope; lower concurrent overlays may remain mounted but are
non-interactive. Shadow content stays inert while any modal is mounted,
including its exit animation. An ancestor close may start its own and its
descendants' exit phases together, but every descendant must unmount before the
ancestor. Focus restores only after an overlay unmounts, in this order: a
connected opener in the remaining active scope; otherwise the remaining top
layer; otherwise the outer opener once the last modal leaves. A disconnected
opener is skipped in favor of the next tier.

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

The current active-ID sets prove lazy portal lifetime but do not implement this
contract. Production support requires a root-owned layer registry, descendant
close ordering, topmost interaction gating, modal-aware focus containment, and
direct browser evidence for nested and concurrent cases. Until that work lands,
nested or concurrent overlays in one shadow root remain unsupported and do not
block this decision from being revised by browser or assistive-technology
findings.
