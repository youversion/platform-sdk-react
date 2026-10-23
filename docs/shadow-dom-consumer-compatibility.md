# Shadow DOM Consumer Compatibility Contract

## Purpose

This contract records cross-browser evidence for consumer-facing behavior at
the SDK's Shadow DOM boundary. YPE-5356 incorporates it into the
[production rollout policy](shadow-dom-rollout-policy.md), which maintains the
stable-package and coordinated-release-branch boundary inventory and release
status.

The executable evidence is grouped by rollout surface:

- `consumer-compatibility.shadow-isolation.stories.tsx` covers shared consumer
  boundary behavior.
- `bible-version-picker.shadow-isolation.stories.tsx` covers shadow-aware picker
  queries and relationships that stay within one tree scope.
- `scripture-presentation-shadow-isolation.test.tsx` and
  `scripture-presentation.shadow-isolation.stories.tsx` cover `BibleTextView`,
  `VerseOfTheDay`, and `BibleCard`.
- `bible-reader-shadow-isolation.test.tsx` and `bible-reader.stories.tsx` cover
  the `BibleReader.Root` boundary and consumer composition contract.

## Representative modules

- `YouVersionAuthButton` exercises the current automatic-isolation path and its
  public event and forwarded-ref props.
- `Textarea`, rendered through the internal opt-in `ShadowRootHost`, isolates a
  native form control without adding a production behavior or public wrapper.
- `BibleChapterPicker.Root` and `BibleVersionPicker.Root` exercise automatic
  compound-component boundaries with shadow-local floating content. Their
  trigger, content, and language members reuse the owning root.
- `BibleTextView`, `VerseOfTheDay`, and `BibleCard` exercise automatic
  scripture-presentation boundaries and reuse the owning root for composed
  scripture and picker content.
- `BibleReader.Root` exercises a compound application surface whose arbitrary
  React children move into the reader root while reader-owned descendants
  reuse that boundary.

These modules validate the shared boundary and specific public interfaces they
exercise. They do not establish compatibility for every SDK component.

## Compatibility matrix

| Consumer scenario | Classification | Contract and evidence |
| --- | --- | --- |
| A light-DOM form natively owns or serializes a control inside an SDK shadow root | Unsupported | `FormsAndExternalRelationshipsStopAtTheTreeScope` verifies that the isolated textarea has no owner form, is absent from `form.elements`, and is absent from `FormData`. A rollout target that needs form participation requires an explicit component API or separately designed form-associated host contract. |
| A light-DOM `<label for>` labels or focuses a control inside an SDK shadow root | Unsupported | The same story verifies that `label.control` is `null` and clicking the label does not focus the isolated textarea. Put the label and control in the same tree scope or expose an explicit component labeling API. |
| An internal control resolves light-DOM `aria-labelledby` or `aria-describedby` ID references | Unsupported | The attributes remain present, but reflected element arrays are empty across the boundary in Chromium, Firefox, and Playwright WebKit. Keep referenced nodes in the same tree scope. This DOM evidence is not a substitute for assistive-technology testing. |
| A native composed event crosses one shadow boundary | Supported with native retargeting | `EventsRefsAndDomQueriesExposeDifferentConsumerViews` clicks an internal label element and verifies that a light-DOM listener receives the shadow host as `event.target`; `composedPath()` begins with the label and includes the internal button and host. Consumers must not assume an external native listener's target is the internal control. |
| A React handler passed to `YouVersionAuthButton` receives its button event | Supported for this public component | The same story verifies that the consumer `onClick` handler receives the internal originating label as `target` and the internal button as `currentTarget`. Consumers may rely on the button current target, not on every event originating at the button itself. This is component-specific evidence, not a package-wide promise for every event prop. |
| A consumer bubbling React handler wraps an automatically isolated component in the light DOM | Supported for the validated event families; narrow shared-host fix | YPE-6040, YPE-6135, and YPE-6210 verify that one native `click`, `keydown`, `keyup`, `pointerdown`, `pointerup`, `mousedown`, `mouseup`, `dblclick`, or `contextmenu`, one native `input` corresponding to React `onInput`, or one native `focusin`/`focusout` corresponding to React `onFocus`/`onBlur`, invokes the light-DOM ancestor React handler once. The same native `input` also produces one React `onChange` without a host handler because its outer pass is retargeted to the non-form host. That React handler receives the internal shadow node as `event.target`, so `event.currentTarget.contains(event.target)` is false. YPE-6210 directly dispatches a fresh owner-realm event for each added family. Its representative pointer and text-input events verify one component callback with the internal control as `target` and `currentTarget` and the original event as `nativeEvent`; one external native delivery retargeted to the host; and a `composedPath()` beginning at the internal control and containing the host. A `pointerdown` dispatched on the host itself still reaches the ancestor and native listener once without invoking the component callback. The shared host handles only the matching duplicate bubbling paths; native propagation remains unchanged. Separately, standard React focus semantics mean that a focus move between nodes inside one root still invokes light-DOM ancestor React `onFocus`/`onBlur` handlers, while native light-DOM listeners receive no event; the cited stories do not exercise this intra-root path. On that internal move, the ancestor React `onBlur` receives the internal destination as `event.relatedTarget`, so `event.currentTarget.contains(event.relatedTarget)` is also false and must not be used to decide whether focus left the ancestor. Separate native events remain separate. |
| A consumer capture-phase React handler wraps an automatically isolated component in the light DOM | Documented limitation | YPE-6210 observes that one fresh composed internal `click` invokes a light-DOM ancestor `onClickCapture` twice. The shared host does not redesign React capture semantics or suppress native propagation, so this remains an explicit limitation rather than a broadened event-system fix. |
| A forwarded `YouVersionAuthButton` ref exposes the internal button | Supported after mount | The ref resolves to the exact internal `HTMLButtonElement`. It remains `null` through the consumer's first layout effect because the shadow root attaches in a passive effect; consumers must handle callback-ref updates or read object refs after a later commit. |
| An ordinary document or Storybook-canvas selector finds SDK internals | Unsupported | DOM selector APIs do not cross a shadow boundary. `document.querySelector` and Testing Library queries rooted at the document need explicit open-root traversal. Automation behavior is tool-specific: [Playwright locators pierce open roots by default](https://playwright.dev/docs/locators#locate-in-shadow-dom), except for XPath locators, while closed roots remain inaccessible. |
| A consumer traverses an open root and queries after attachment | Supported with timing and access constraints | Wait for the host's open `shadowRoot`, then query within it. The contract depends on the rollout's open-root policy and does not make internals a stable semantic API; prefer public refs, roles, and component callbacks where available. |
| An automatically isolated component is nested inside another open SDK shadow root | Supported for basic rendering, traversal, and composed events | `NestedRootsRequireTraversalAndRetargetAtEveryBoundary` verifies recursive root traversal, one React ancestor delivery per scope for representative `click`, `pointerdown`, and focus-leave events, and target retargeting to the inner host in the outer scope and to the outer host in the document scope. Consumers must traverse every root explicitly. |
| Nested overlays inside shadow roots | Supported in current browser evidence | YPE-5355 verifies nested dialog and popover stacking, focus, inertness, dismissal, and restoration through the shared shadow-local portal infrastructure. Repeat component-specific validation during rollout. |
| Concurrent peer popovers inside the same or separate component roots | Unsupported as simultaneous peers | Opening a peer dismisses the current popover through Radix outside interaction. YPE-5356 accepts this single-active-peer behavior; supporting simultaneous peers requires a demonstrated product journey and separate design. |
| Native Popover API support is unavailable | Unsupported for isolated floating content | The shadow-local top-layer strategy has no silent inline fallback. Opening an affected overlay throws; if no consumer error boundary contains the error, React can unmount the affected consumer root. |
| A standalone `VerseActionPopover` receives an anchor from another DOM tree | Unsupported | The public popover accepts a live anchor element and does not create an automatic boundary. Keep the anchor and standalone popover in the same document or shadow root. |
| Shadow-local picker relationships | Supported in current browser evidence | The chapter and version picker stories verify that each trigger and controlled panel remain in one root and resolve their `aria-controls` relationship. This does not make cross-scope ID references supported. |
| Consumer-supplied picker triggers | Supported within the explicit styling contract | The supplied element remains the interactive trigger. Inline style, ordinary attributes, and SDK-embedded utility classes are preserved. Document/global class rules and document-level token overrides do not cross the root. The SDK does not promise CSS Parts, arbitrary stylesheet injection, or styling of picker internals. |
| Arbitrary `BibleReader.Root` children | Supported inside the reader root; breaking DOM/CSS placement change | Children render in the reader's open shadow root. Their React context and callbacks remain intact, but document-root selectors, global CSS, and document queries no longer reach them. A child that is itself an automatically isolated public component may intentionally create a nested root; reader-owned SDK composition suppresses accidental nesting. YPE-5952 owns the coordinated release documentation. |
| An ancestor uses `visibility` or `pointer-events` to hide or disable an isolated descendant | Unsupported as a control mechanism | The internal shadow reset can restore those properties, leaving descendants visible, clickable, or focusable. Ancestor geometry can still clip, transform, size, or otherwise constrain the light-DOM host. To hide an isolated component, apply `display: none` to a consumer-owned light-DOM wrapper or do not render the component. To disable one, use a supported component API instead of ancestor `pointer-events`. |

## Consumer risks

Automatic isolation changes rendered DOM even when React props stay the same.
Consumer selectors and global CSS stop reaching internals; native event targets
change at every boundary; external form and ID-reference relationships stop
resolving; and forwarded refs become available later. These are compatibility
and potentially breaking changes, not internal implementation details.

Light-DOM ancestor React capture handlers and unlisted composed bubbling
families can still receive duplicate dispatch. YPE-6210 covers
`onClickCapture`. Focused Chromium probes observed duplicate `pointermove`,
`mousemove`, `wheel`, `keypress`, `dragstart`, and `copy` delivery. The list is
representative, not exhaustive; only the validated families above have the
single-delivery contract.

An open root permits inspection and mutation by same-page JavaScript, so it is
an automation and styling boundary rather than a security boundary. Selectors
that depend on internal markup remain fragile even when they traverse the root.

The focused Shadow DOM suite supplies the browser evidence cited by this
contract. The final actual-Safari gate decision, accepted limitations, and
future rerun requirements live in the
[validation plan](shadow-dom-isolation-plan.md#ype-6214-final-release-candidate-safari-validation).
Exact assistive-technology environments, per-journey results, and remaining gaps
live in the [assistive-technology evidence](shadow-dom-isolation-plan.md#assistive-technology-evidence).
Reflected ARIA element properties demonstrate DOM relationship resolution, not
announcements or other assistive-technology behavior. Claims name only the exact
browser and assistive-technology combination validated.

## Follow-up work

If a rollout component must participate in an outer native form or consume
external labeling relationships, it needs an explicit public contract rather
than cross-scope browser behavior. Bounded assistive-technology validation,
release documentation, and the coordinated stable release remain assigned by the
[production rollout policy](shadow-dom-rollout-policy.md).
