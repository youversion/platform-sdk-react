# ADR 0005: Prototype automatic Shadow DOM style isolation

Status: Proposed proof of concept

## Problem

Host applications can apply unlayered global rules such as `button { ... }` or
Tailwind v3 preflight to SDK markup. Unlayered author CSS outranks the SDK's
layered CSS, so selector specificity alone cannot guarantee isolation.

Resets, stronger selectors, `!important`, cascade layers, and `@scope` all
continue participating in the host document's cascade. They can reduce
accidental conflicts but cannot prevent an outside selector from matching SDK
internals. Shadow DOM was selected because it creates a browser-enforced
selector boundary.

## Prototype

`YouVersionAuthButton` automatically creates an open shadow root and renders its
existing implementation inside it through a React portal. The SDK's compiled
Tailwind CSS—generated from `src/styles/global.css` and embedded as
`__YV_STYLES__`—is installed inside that root. Consumers continue to write
`<YouVersionAuthButton />`; isolation is not an option they must discover or
enable.

This PR intentionally applies the architecture to one representative component.
It asks whether automatic Shadow DOM boundaries are the right foundation before
the same pattern is rolled out across the UI package.

The constructable stylesheet is cached per owner `Document`, because a sheet
created in the top-level document cannot be adopted by a shadow root rendered in
a same-origin iframe. Browsers without constructable stylesheets receive a
`<style>` element in the root. The light-DOM host gets an inline-important box
reset; an inner, unreachable wrapper resets inherited standard properties.
The shadow stylesheet also suppresses `::before` and `::after` on the
light-DOM host with shadow-context important declarations, preventing host-page
CSS from injecting generated content around the isolated component.
Because that reset removes the light-DOM font inheritance the button previously
relied on, the implementation now applies its intended `font-sans` utility
explicitly.

The Vite example includes a Hostile CSS page with a light-DOM positive control
beside the isolated SDK button. It demonstrates type selectors, inherited
properties, universal `!important` rules, direct shadow-host attacks, and a known
document-wide `@font-face` limitation.

## What this proves

- Ordinary and `!important` host selectors cannot select the button internals.
- Isolation is automatic without changing the component's React props API.
- Existing click behavior continues to work through the React portal.
- Strict Mode does not attach the root twice.
- Constructed stylesheets are created per owner document, so mounting the shadow
  host in a same-origin iframe does not cause a cross-document adoption error.

Focused Chromium stories verify hostile button rules, host-generated
pseudo-content, existing interactions, and mounting in a same-origin iframe.
Unit tests verify Strict Mode behavior and the inline-important host reset. The
remaining hostile vectors are available for manual inspection on the demo page.

## Compatibility impact

Although the React props API is unchanged, the rendered DOM structure is not.
Consumers that query or style internal light-DOM markup must instead account for
the shadow root. Because the prototype attaches the shadow root in `useEffect`,
server output contains an empty host. The button appears after hydration, and
its forwarded ref becomes available later than it did previously. This is
therefore represented as a breaking change rather than an implementation
detail.

## Deliberately deferred

- Rollout to all exported components.
- Radix popover/dialog portal placement and focus management.
- Form association when controls live outside their form's tree scope.
- SSR/hydration and the first client paint.
- A package-wide custom-property audit. `all: initial` does not reset custom
  properties; the larger investigation branch tested redeclaring Tailwind v4's
  generated theme tokens on the protected internal wrapper.
- A deliberate inheritance policy for writing direction and future custom
  properties. Some host values may be intentional localization inputs, while
  SDK-owned visual tokens need shadow-local defaults.
- Host `@font-face` rules, which are not scoped by Shadow DOM.
- Ancestor layout constraints, which Shadow DOM cannot isolate.
- Event retargeting, nested-root behavior, and a supported consumer customization
  model.
- Stylesheet construction/adoption failure recovery beyond feature fallback.
- A full browser and assistive-technology matrix; current browser verification is
  Chromium-focused.
- Consumer test-query migration guidance and a component-by-component rollout.

This prototype should be reviewed as an architectural checkpoint, not as a
complete solution ready for release.
