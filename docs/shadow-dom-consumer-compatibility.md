# Shadow DOM Consumer Compatibility Contract

## Purpose

This contract records cross-browser evidence for consumer-facing behavior at
the SDK's Shadow DOM boundary. YPE-5356 incorporates it into the
[production rollout policy](shadow-dom-rollout-policy.md). On the Shadow DOM
integration branch, `YouVersionAuthButton`, `BibleChapterPicker.Root`, and
`BibleVersionPicker.Root` create automatic boundaries; the coordinated stable
release is still pending.

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
- `BibleChapterPicker.Root` and `BibleVersionPicker.Root` exercise automatic
  compound-component boundaries with shadow-local floating content. Their
  trigger, content, and language members reuse the owning root.

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
| A forwarded `YouVersionAuthButton` ref exposes the internal button | Supported after mount | The ref resolves to the exact internal `HTMLButtonElement`. It remains `null` through the consumer's first layout effect because the shadow root attaches in a passive effect; consumers must handle callback-ref updates or read object refs after a later commit. |
| An ordinary document or Storybook-canvas selector finds SDK internals | Unsupported | DOM selector APIs do not cross a shadow boundary. `document.querySelector` and Testing Library queries rooted at the document need explicit open-root traversal. Automation behavior is tool-specific: [Playwright locators pierce open roots by default](https://playwright.dev/docs/locators#locate-in-shadow-dom), except for XPath locators, while closed roots remain inaccessible. |
| A consumer traverses an open root and queries after attachment | Supported with timing and access constraints | Wait for the host's open `shadowRoot`, then query within it. The contract depends on the prototype's open-root policy and does not make internals a stable semantic API; prefer public refs, roles, and component callbacks where available. |
| An automatically isolated component is nested inside another open SDK shadow root | Supported for basic rendering, traversal, and composed events | `NestedRootsRequireTraversalAndRetargetAtEveryBoundary` verifies recursive root traversal and target retargeting to the inner host in the outer scope and to the outer host in the document scope. Consumers must traverse every root explicitly. |
| Nested overlays inside shadow roots | Supported in current browser evidence | YPE-5355 verifies nested dialog and popover stacking, focus, inertness, dismissal, and restoration through the shared shadow-local portal infrastructure. Repeat component-specific validation during rollout. |
| Concurrent peer popovers inside the same or separate component roots | Unsupported as simultaneous peers | Opening a peer dismisses the current popover through Radix outside interaction. YPE-5356 accepts this single-active-peer behavior; supporting simultaneous peers requires a demonstrated product journey and separate design. |
| Shadow-local picker relationships | Supported in current browser evidence | The chapter and version picker stories verify that each trigger and controlled panel remain in one root and resolve their `aria-controls` relationship. This does not make cross-scope ID references supported. |
| Consumer-supplied picker triggers | Supported within the explicit styling contract | The supplied element remains the interactive trigger. Inline style, ordinary attributes, and SDK-embedded utility classes are preserved. Document/global class rules and document-level token overrides do not cross the root. The SDK does not promise CSS Parts, arbitrary stylesheet injection, or styling of picker internals. |

## Consumer risks

Automatic isolation changes rendered DOM even when React props stay the same.
Consumer selectors and global CSS stop reaching internals; native event targets
change at every boundary; external form and ID-reference relationships stop
resolving; and forwarded refs become available later. These are compatibility
and potentially breaking changes, not internal implementation details.

An open root permits inspection and mutation by same-page JavaScript, so it is
an automation and styling boundary rather than a security boundary. Selectors
that depend on internal markup remain fragile even when they traverse the root.

The focused Shadow DOM suite runs in Chromium, Firefox, and Playwright WebKit.
The 22-story pre-picker-rollout baseline returned assertion-level success in local Safari 26.6.2
through SafariDriver when each ran in a fresh browser session. A single
long-lived SafariDriver session stalled on the sign-in dialog and verse action
popover stories after 20 successes, so isolated sessions are required for this
smoke setup. Actual Safari is not part of continuous integration. Real
assistive technologies remain unverified. Reflected ARIA element properties
demonstrate DOM relationship resolution, not announcements or other
assistive-technology behavior.

## Follow-up work

If a rollout component must participate in an outer native form or consume
external labeling relationships, it needs an explicit public contract rather
than cross-scope browser behavior. Recurring Safari, deferred assistive-
technology validation, release documentation, and the coordinated stable
release remain assigned by the
[production rollout policy](shadow-dom-rollout-policy.md).
