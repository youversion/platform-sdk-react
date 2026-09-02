# Shadow DOM Consumer Compatibility Contract

## Purpose

This contract records the Chromium evidence for consumer-facing behavior at the
SDK's Shadow DOM boundary. It is input to YPE-5356's production rollout policy,
not approval for automatic isolation beyond `YouVersionAuthButton`.

The executable evidence lives in
`consumer-compatibility.shadow-isolation.stories.tsx`. The existing
`bible-version-picker.shadow-isolation.stories.tsx` suite supplies additional
evidence for shadow-aware queries and relationships that stay within one tree
scope.

## Representative modules

- `YouVersionAuthButton` exercises the current automatic-isolation path and its
  public event and forwarded-ref props.
- `Textarea`, rendered through the internal opt-in `ShadowRootHost`, isolates a
  native form control without adding a production behavior or public wrapper.
- `BibleVersionPicker`, also rendered through the opt-in host, exercises a
  composed public module with shadow-local floating content.

These modules validate the shared boundary and specific public interfaces they
exercise. They do not establish compatibility for every SDK component.

## Compatibility matrix

| Consumer scenario | Classification | Contract and evidence |
| --- | --- | --- |
| A light-DOM form natively owns or serializes a control inside an SDK shadow root | Unsupported | `FormsAndExternalRelationshipsStopAtTheTreeScope` verifies that the isolated textarea has no owner form, is absent from `form.elements`, and is absent from `FormData`. A rollout target that needs form participation requires an explicit component API or separately designed form-associated host contract. |
| A light-DOM `<label for>` labels or focuses a control inside an SDK shadow root | Unsupported | The same story verifies that `label.control` is `null` and clicking the label does not focus the isolated textarea. Put the label and control in the same tree scope or expose an explicit component labeling API. |
| An internal control resolves light-DOM `aria-labelledby` or `aria-describedby` ID references | Unsupported | The attributes remain present, but Chromium's reflected element arrays are empty across the boundary. Keep referenced nodes in the same tree scope. This DOM evidence is not a substitute for assistive-technology testing. |
| A native composed event crosses one shadow boundary | Supported with native retargeting | `EventsRefsAndAutomationExposeDifferentConsumerViews` verifies that a light-DOM listener receives the shadow host as `event.target`; `composedPath()` begins with the internal button and includes the host. Consumers must not assume an external native listener's target is the internal control. |
| A React handler passed to `YouVersionAuthButton` receives its button event | Supported for this public component | The same story verifies that the consumer `onClick` handler receives the internal button as both target and current target. This is component-specific evidence, not a package-wide promise for every event prop. |
| A forwarded `YouVersionAuthButton` ref exposes the internal button | Supported after mount | The ref resolves to the internal `HTMLButtonElement`. It is `null` during initial render because the shadow root attaches in an effect; consumers must handle callback-ref updates or read object refs after commit. |
| An ordinary document or Storybook-canvas selector finds SDK internals | Unsupported | Selectors do not cross a shadow boundary. `document.querySelector`, Testing Library queries rooted at the document, and equivalent automation locators need an explicit shadow-aware strategy. |
| A consumer traverses an open root and queries after attachment | Supported with timing and access constraints | Wait for the host's open `shadowRoot`, then query within it. The contract depends on the prototype's open-root policy and does not make internals a stable semantic API; prefer public refs, roles, and component callbacks where available. |
| An automatically isolated component is nested inside another open SDK shadow root | Supported for basic rendering, traversal, refs, and composed events | `NestedRootsRequireTraversalAndRetargetAtEveryBoundary` verifies recursive root traversal and target retargeting to the inner host in the outer scope and to the outer host in the document scope. Consumers must traverse every root explicitly. |
| Nested or concurrent overlays inside shadow roots | Unsupported by this contract | YPE-5355 owns stacking, focus, inertness, dismissal, and restoration. Basic nested-root evidence here does not change that overlay boundary. |
| Shadow-local ID relationships inside `BibleVersionPicker` | Supported in current Chromium evidence | `TopLayerEscapesClippingAndPreservesSemantics` verifies that the trigger and controlled panel remain in one root and Chromium resolves their `aria-controls` relationship. This does not make cross-scope ID references supported. |

## Consumer risks

Automatic isolation changes rendered DOM even when React props stay the same.
Consumer selectors and global CSS stop reaching internals; native event targets
change at every boundary; external form and ID-reference relationships stop
resolving; and forwarded refs become available later. These are compatibility
and potentially breaking changes, not internal implementation details.

An open root permits inspection and mutation by same-page JavaScript, so it is
an automation and styling boundary rather than a security boundary. Selectors
that depend on internal markup remain fragile even when they traverse the root.

The executable suite currently runs only in Chromium. Firefox, WebKit, and real
assistive technologies remain unverified. Chromium's reflected ARIA element
properties demonstrate DOM relationship resolution, not announcements or other
assistive-technology behavior.

## Input for YPE-5356

The rollout policy should treat automatic isolation as a compatibility change
and require a component-specific audit before each rollout. In particular, it
must:

- identify consumers that rely on native outer-form participation, external
  labels or ARIA ID references, document-rooted queries, synchronous refs, or
  unretargeted native events;
- prefer rollout candidates whose public callbacks, refs, and internal labels
  already avoid those cross-scope dependencies;
- define consumer automation guidance around roles, public refs, and explicit
  open-root traversal with an attachment wait;
- define required Firefox, WebKit, and assistive-technology evidence rather than
  treating the Chromium results as universal; and
- preserve YPE-5355's separate ownership of nested and concurrent overlay
  behavior.

## Follow-up work outside this ticket

No production defect is fixed by this validation ticket. If a selected rollout
component must participate in an outer native form or consume external labeling
relationships, create a component-specific implementation ticket for an
explicit public contract rather than relying on cross-scope browser behavior.
Cross-browser and assistive-technology validation, consumer-facing rollout
documentation, and any production implementation belong to YPE-5356 or
separately authorized follow-up tickets. No new Jira issue is created by this
document.
