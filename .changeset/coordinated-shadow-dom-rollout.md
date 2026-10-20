---
'@youversion/platform-react-ui': major
---

Ship the coordinated Shadow DOM rollout as a breaking rendered-DOM change. The
compatible public UI boundary now mounts in client-created open shadow roots:
`YouVersionAuthButton`, the chapter and version picker roots,
`BibleReader.Root`, and standalone theme settings, scripture, card, avatar,
footnote, and separator surfaces. SDK-owned compound members and composed
children reuse their owning boundary.

Server output for these components is a childless light-DOM host whose inline
`display` declares the boundary's intended layout until the passive-effect client
mount. Automatic shadow hosts therefore require strict CSP applications to allow
or hash style attributes as described in the
[UI Content Security Policy guidance](https://github.com/youversion/platform-sdk-react/blob/main/packages/ui/README.md#content-security-policy).
Document queries and global CSS no longer reach component internals,
forwarded element refs become available after that mount, and native events
observed outside a root are retargeted to its host. Keep form
ownership, native labels, and ARIA ID references within one tree; use public
props, callbacks, refs, and role-based automation instead of depending on
internal markup. Fonts remain document-owned, `rem` sizing follows the document
root, `direction` remains inherited, and ancestor layout can still constrain the
host. Shadow-local overlays use the native top layer, and opening a peer popover
dismisses the current peer. The native Popover API is required for isolated
floating content; there is no inline fallback, and an unhandled open error can
unmount the affected consumer React root. Popover content also respects Radix's
available collision height. Validated bubbling `click`, `keydown`, `keyup`,
`pointerdown`, `pointerup`, `mousedown`, `mouseup`, `dblclick`, `contextmenu`,
focus, and blur paths reach light-DOM ancestor React handlers once. Capture
handlers and unlisted composed bubbling families can still receive duplicate
delivery. YPE-6210 covers `onClickCapture`; focused Chromium probes observed
duplicate move, wheel, input, keypress, drag-start, and copy delivery. This list
is representative, not exhaustive. Text input can therefore invoke an ancestor
React `onChange` twice.

`Textarea`, standalone `VerseActionPopover`, `YouVersionProvider`, and
`BaseYouVersionProvider` remain outside the automatic boundary for their
document-level form, anchor, context, style, or font contracts. The release does
not add runtime rollout controls or phased-release infrastructure.

See the
[release-candidate evidence](https://github.com/youversion/platform-sdk-react/blob/main/docs/shadow-dom-isolation-plan.md#ype-5952-release-candidate-validation)
for environments, browser and assistive-technology results, per-journey results,
and remaining validation gaps.

Shared popover dialogs now derive an accessible name from their visible heading
unless the consumer provides an explicit label. The reader sign-in and sign-out
menu has an explicit accessible name, and the version picker places initial
focus on its language selector.
