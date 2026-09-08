# ADR 0007: Prototype automatic Shadow DOM style isolation

Status: Proposed (validated experimentally; not approved for production rollout)

Host applications can apply unlayered global CSS, including Tailwind preflight,
that outranks the UI package's layered styles. Resets, stronger selectors,
`!important`, cascade layers, and `@scope` remain part of the host document's
cascade and cannot prevent outside selectors from matching SDK internals. The
prototype therefore uses Shadow DOM as the browser-enforced style boundary.

## Decision for the prototype

`YouVersionAuthButton` automatically creates an open shadow root and renders its
existing implementation into it through a React portal. Consumers continue to
use the same component API; they do not need to discover or enable isolation.
The SDK's compiled Tailwind CSS is installed inside the root, the light-DOM host
receives a protected box reset, and an internal wrapper resets inherited visual
properties.

Writing direction is the only intentional inherited visual input: both reset
boundaries explicitly preserve `direction`, while `all: initial` restores
horizontal writing, mixed text orientation, SDK typography, and other visual
properties. Vertical host writing modes and host typography are unsupported.
Known ambient custom-property dependencies are closed by using SDK-owned
`--yv-spacing` and `--yv-radius` values and by defining a local `--spacing`
compatibility alias for `tw-animate-css`. YPE-5400 owns the full custom-property
inventory and a compiled-CSS prevention guard.

Constructable stylesheets are cached per owning `Document`, because a sheet from
the top-level document cannot be adopted into a same-origin iframe's shadow
root. Environments without constructable stylesheets receive a `<style>` element
instead.

The same infrastructure was exercised as an internal opt-in with
`BibleVersionPicker` and the shared Dialog and Popover primitives. Floating
content remains in its component's shadow tree so ID relationships remain
resolvable. When it must escape a clipping ancestor, a shadow-local portal
container enters the native top layer using `popover="manual"`.

Modal dialogs require additional shadow-aware focus coordination. Radix's
document-level tracking sees the shadow host rather than the focused descendant,
so the isolated Dialog uses composed focus events to contain programmatic focus
and `tabbable` to own Tab and Shift+Tab traversal. The non-dialog shadow content
remains inert until both Dialog Overlay and Content have unmounted, after which
focus is restored to the real opener.

## Considered options

- Stronger selectors, resets, cascade layers, `@scope`, and `!important` reduce
  collisions but do not create a selector boundary.
- A shared shadow overlay under `document.body` escapes clipping, but separates
  triggers and floating content into different tree scopes and breaks resolved
  ID relationships.
- A shadow-local inline portal preserves tree scope but remains vulnerable to
  clipping ancestors.
- An iframe provides stronger document isolation, but does not compose naturally
  with React context, refs, events, sizing, focus, or floating content.

The shadow-local native top-layer arrangement is the selected prototype because
it preserves tree scope and style isolation while escaping ancestor clipping.
The top-layer strategy requires the native Popover API; it does not silently
fall back to the clipped inline arrangement.

## Consequences

The React props API remains unchanged, but the rendered DOM structure changes.
Consumer CSS and ordinary document queries cannot reach component internals.
Native events observed outside the root are retargeted to the shadow host.

The root currently attaches in `useEffect`, so server output contains an empty
host, isolated content appears after hydration, and forwarded refs become
available later. Automatic isolation is therefore a breaking change rather than
an internal implementation detail.

Shadow DOM does not isolate document-scoped `@font-face` names; the prototype
accepts that host registrations can collide with SDK family names. It also
cannot protect a component host from constraints applied to its ancestors. Open
roots are a CSS boundary, not a security boundary.

## Nested and concurrent overlays

YPE-5355 exercised nested and concurrent overlays through the production
`ShadowRootHost` seam. Both nesting directions preserve topmost-only Escape
dismissal and restore focus into the remaining parent overlay. Either
nested-overlay teardown order also works with the current architecture. Separate
component shadow roots own distinct portal containers, but do not isolate Radix
outside interaction: opening a peer popover dismisses the existing peer across
the same or separate roots. A verse action popover does not restore final focus
after its nested dialog and then the popover close, and rapid dialog close/reopen
also loses final focus restoration.

Keep one shadow root, one shadow-local native top-layer container, and one React
tree. Continue to use Radix for presence, focus scopes, outside interaction, and
keyboard behavior. Do not add PR 375's separate ownership class, parent graph,
custom exit phase, or duplicate focus trap.

YPE-5356 owns production coordination. If it requires concurrent peers within or
across component shadow roots, or exact final focus restoration for the
unsupported cases, extend the controller already owned by `ShadowRootHost`. Any
design must account for overlay order, connected restore targets, and the outside
interaction that can dismiss a peer before the new overlay registers. The
detailed Chromium evidence and remaining validation live in the rollout plan.

The smallest extension has two responsibilities. First, a managed overlay trigger
marks its original `pointerdown` during target capture with an open intent and
owner identity. Radix observes outside interaction later from its document bubble
listener; the existing overlay can inspect that same composed event and prevent
its dismissal when the intent targets a peer that may remain concurrent. This
handles trigger-time dismissal within or across shadow roots without a separate
global ownership registry. The controller commits the ordered overlay entry only
if content mounts and otherwise clears the intent.

Second, the controller captures one connected, non-overlay restore target before
the first overlay in a chain opens. Nested opens and close/reopen during retained
exit presence do not replace it with an overlay node. After the final overlay and
exit lease release, the controller restores that target if it is still connected,
then clears the chain. Keep Radix's focus scopes, dismissal events, and presence;
do not add a second focus trap or parent graph.

Radix's development-only relationship checks can also emit warnings for valid
IDs inside a shadow root because those checks query the document rather than
the root.

Only `YouVersionAuthButton` is automatically isolated by this prototype.
`BibleVersionPicker` and other public exports do not gain automatic isolation
from the opt-in validation work. The internal `SignInDialog` is validated only
through an opt-in story. Any wider rollout requires a separate decision and
change.

The detailed evidence, unresolved audits, and rollout gates live in the
[Shadow DOM isolation validation and rollout plan](../shadow-dom-isolation-plan.md).
