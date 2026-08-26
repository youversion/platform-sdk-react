# ADR 0006: Prototype automatic Shadow DOM style isolation

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

Shadow DOM does not isolate document-scoped `@font-face` names or protect a
component host from constraints applied to its ancestors. Open roots are a CSS
boundary, not a security boundary.

Concurrent independent overlays in one shadow root and nested overlays launched
from an open dialog are unsupported until the package defines stacking, focus
ownership, and dismissal contracts. Radix's development-only relationship
checks can also emit warnings for valid IDs inside a shadow root because those
checks query the document rather than the root.

Only `YouVersionAuthButton` is automatically isolated by this prototype.
`BibleVersionPicker`, `SignInDialog`, and other public exports do not gain
automatic isolation from the opt-in validation work. Any wider rollout requires
a separate decision and change.

The detailed evidence, unresolved audits, and rollout gates live in the
[Shadow DOM isolation validation and rollout plan](../shadow-dom-isolation-plan.md).

