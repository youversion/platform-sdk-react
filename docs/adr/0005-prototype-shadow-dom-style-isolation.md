# ADR 0005: Prototype automatic Shadow DOM style isolation

Status: Proposed proof of concept

## Problem

Host applications can apply unlayered global rules such as `button { ... }` or
Tailwind v3 preflight to SDK markup. Unlayered author CSS outranks the SDK's
layered CSS, so selector specificity alone cannot guarantee isolation.

## Prototype

`YouVersionAuthButton` automatically creates an open shadow root and renders its
existing implementation inside it. The SDK's compiled CSS is installed inside
that root. Consumers continue to write `<YouVersionAuthButton />`; isolation is
not an option they must discover or enable.

This PR intentionally applies the architecture to one representative component.
It asks whether automatic Shadow DOM boundaries are the right foundation before
the same pattern is rolled out across the UI package.

The constructable stylesheet is cached per owner `Document`, because a sheet
created in the top-level document cannot be adopted by a shadow root rendered in
a same-origin iframe. Browsers without constructable stylesheets receive a
`<style>` element in the root. The light-DOM host gets an inline-important box
reset; an inner, unreachable wrapper resets inherited standard properties.

## What this proves

- Ordinary and `!important` host selectors cannot select the button internals.
- The consumer API is unchanged and isolation is automatic.
- Existing click handlers and forwarded refs can cross the React portal.
- Strict Mode does not attach the root twice.

## Deliberately deferred

- Rollout to all exported components.
- Radix popover/dialog portal placement and focus management.
- Form association when controls live outside their form's tree scope.
- SSR/hydration and the first client paint.
- Host `@font-face` rules, which are not scoped by Shadow DOM.
- A full browser/accessibility matrix and consumer test-query migration guidance.

This prototype should be reviewed as an architectural checkpoint, not as a
complete solution ready for release.
