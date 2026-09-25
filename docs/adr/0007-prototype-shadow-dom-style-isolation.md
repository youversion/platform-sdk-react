# ADR 0007: Prototype automatic Shadow DOM style isolation

Status: Accepted for coordinated rollout planning; production expansion is not yet shipped

YPE-5356 accepts the architecture for a coordinated major-version rollout
across the compatible public UI boundary defined in the
[production rollout policy](../shadow-dom-rollout-policy.md). Implementation is
split into dependency-ordered component groups, but the package must not publish
a partial boundary. This ADR continues to describe current runtime behavior
until those groups land: only `YouVersionAuthButton` creates an automatic shadow
root.

The automatic boundary belongs to the SDK-owned top-level component instance.
Compound members and SDK components composed inside another isolated SDK
component reuse their owning boundary instead of creating accidental nested
roots. `Textarea`, standalone `VerseActionPopover`, and `YouVersionProvider`
remain outside the approved automatic boundary for the reasons recorded in the
rollout policy.

Host applications can apply unlayered global CSS, including Tailwind preflight,
that outranks the UI package's layered styles. Resets, stronger selectors,
`!important`, cascade layers, and `@scope` remain part of the host document's
cascade and cannot prevent outside selectors from matching SDK internals. The
prototype therefore uses Shadow DOM as the browser-enforced style boundary.

## Decision for the prototype

`YouVersionAuthButton` automatically creates an open shadow root and renders its
existing implementation into it through a React portal. Consumers continue to
use the same component API; they do not need to discover or enable isolation.
The SDK's compiled Tailwind component rules are installed inside the root, the light-DOM host
receives a protected box reset, and an internal wrapper resets inherited visual
properties.

Writing direction is the only intentional inherited CSS property: both reset
boundaries explicitly preserve `direction`, while `all: initial` restores
horizontal writing, mixed text orientation, SDK typography, and other visual
properties. Vertical host writing modes and inherited host typography are unsupported.
This is selector and inheritance isolation, not independent document sizing:
the prototype retains `rem` units, so the owning document's root font size still
scales SDK text, spacing, and controls. That sizing input is accepted for the
prototype; it is not reset by a shadow boundary.
Known ambient custom-property dependencies are closed by using SDK-owned
`--yv-spacing` and `--yv-radius` values and by defining a local `--spacing`
compatibility alias for `tw-animate-css`. The completed YPE-5400 inventory,
exact runtime-input exceptions, and compiled-CSS prevention guard are documented
in the rollout plan.

Constructable stylesheets are cached per owning `Document`, because a sheet from
the top-level document cannot be adopted into a same-origin iframe's shadow
root. Environments without constructable stylesheets receive a `<style>` element
instead. Font loading remains document-owned: `CSSStyleSheet.replaceSync()`
discards `@import`, so the adopted sheet does not load the Google Fonts import
from the compiled CSS (and Chromium warns once when the cached sheet is created).
`YouVersionProvider` installs the document stylesheet and brand-font stylesheet;
an isolated component still depends on those document-level font registrations.
The local `<style>` fallback retains the import but is not a substitute for
document-owned font loading. For iframe consumers, fonts must be loaded in the
iframe's owning document, not merely in the parent document.

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

- Client-side attachment emits an empty host from the server, hydrates that
  host, and mounts isolated content after an effect attaches the shadow root.
  This preserves React's ownership of the light-DOM tree and never exposes the
  component internals to consuming-app CSS. It is the selected contract for the
  prototype.
- Rendering the component in the light DOM on the server and moving or
  remounting it after hydration would make content visible sooner, but exposes
  that first paint to consuming-app CSS and risks replacement, duplicate
  content, and lost DOM identity during hydration.
- Declarative Shadow DOM could provide isolated server content and an isolated
  first paint. This spike did not identify a supported React 19.1
  render-and-hydrate seam for the browser-created shadow tree, so adopting it
  would require custom serialization and hydration behavior. It remains a
  future option for a component that requires server-rendered content.
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

## SSR and hydration contract

`ShadowRootHost` is client-only. Its server markup is exactly an empty host:

```html
<div data-yv-shadow-host="true"></div>
```

The first client render matches that markup. After hydration, `useEffect`
attaches or reuses one open shadow root, installs the SDK stylesheet, and then
portals the component into that root. The component is not rendered in the
light DOM, so hydration does not replace server content or create a duplicate.
If constructable stylesheets are unavailable, the local `<style>` fallback and
the component mount in the shadow root together. A same-origin iframe uses a
stylesheet constructed for its own `Document`; it never adopts the parent
document's sheet.

The server contains no component content. If the browser paints before the
effect runs, that paint is also empty; on a slow client, the user can see this
empty state followed by the component appearing. If JavaScript does not run,
the component never appears. No placeholder space is reserved, so mounting can
move nearby content. Cumulative Layout Shift is a page-level result that also
depends on the consuming app's layout; this prototype neither guarantees zero
shift nor claims the delay is negligible.
The [YPE-5354 first-paint research](../ype-5354-client-only-first-paint-research.md)
records the measurement and reservation options for a future rollout decision.

A forwarded component ref remains `null` during server rendering. It becomes
available after the shadow content mounts and points to the real component
element inside the shadow root, not to the light-DOM host. Before that mount,
the component cannot receive focus or interaction.

This contract is reviewed separately for every implementation group selected
for automatic isolation. YPE-5356 accepts it as the shared starting point, but a
component that requires server content, no-JavaScript content, or a stable
first-paint footprint cannot use this host unchanged. Its implementation ticket
must exclude it or define reserved space, a product timing budget, or a
separately approved SSR strategy.

## Consequences

The React props API remains unchanged, but the rendered DOM structure changes.
Consumer CSS and ordinary document queries cannot reach component internals.
Native events observed outside the root are retargeted to the shadow host.

The client-only SSR and hydration behavior above is part of the component
contract. Automatic isolation is therefore a breaking change rather than an
internal implementation detail.

Shadow DOM does not isolate document-scoped `@font-face` names; the prototype
accepts that host registrations can collide with SDK family names. It also
cannot protect a component host from constraints applied to its ancestors. Open
roots are a CSS boundary, not a security boundary.

## Nested and concurrent overlays

YPE-5355 exercised nested and concurrent overlays through the real shared
`ShadowRootHost` implementation. Both nesting directions preserve topmost-only
Escape dismissal and restore focus into the remaining parent overlay. Either
nested-overlay teardown order also works with the current architecture. Separate
component shadow roots own distinct portal containers, but do not isolate Radix
outside interaction: opening a peer popover dismisses the existing peer across
the same or separate roots. Nested dialog-to-popover dismissal restores focus in
order, and final dismissal returns to the original outside control. A dialog
that closes and reopens during retained exit presence also preserves and restores
its original opener; disconnected targets and targets moved out of their captured
root (into the light DOM, another shadow root, or another document) are ignored.

YPE-5356 accepts single-active-peer popover dismissal rather than introducing
cross-root overlay coordination without a demonstrated product journey. The
focus-restoration defects found by YPE-5355 were resolved by YPE-5889/PR 414 and
remain covered as regressions. The detailed cross-browser evidence and remaining
validation live in the rollout plan.

Radix's development-only relationship checks can also emit warnings for valid
IDs inside a shadow root because those checks query the document rather than
the root.

Only `YouVersionAuthButton` is automatically isolated by this prototype.
`BibleVersionPicker` and other public exports do not gain automatic isolation
from the opt-in validation work. The internal `SignInDialog` is validated only
through an opt-in story. Wider automatic isolation requires completing the
linked implementation groups and coordinated major-release gate.

The detailed experimental evidence remains in the
[Shadow DOM isolation validation plan](../shadow-dom-isolation-plan.md). The
[production rollout policy](../shadow-dom-rollout-policy.md) records the public
component boundary, accepted limitations, implementation order, and release
gates without representing that planned behavior as shipped.
