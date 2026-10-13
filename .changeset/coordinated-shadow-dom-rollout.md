---
'@youversion/platform-react-ui': major
---

Ship the coordinated Shadow DOM rollout as a breaking rendered-DOM change. The
compatible public UI boundary now mounts in client-created open shadow roots:
`YouVersionAuthButton`, the chapter and version picker roots,
`BibleReader.Root`, and standalone theme settings, scripture, card, avatar,
footnote, and separator surfaces. SDK-owned compound members and composed
children reuse their owning boundary.

Server output for these components is an empty light-DOM host until the
passive-effect client mount. Document queries and global CSS no longer reach
component internals, forwarded element refs become available after that mount,
and native events observed outside a root are retargeted to its host. Keep form
ownership, native labels, and ARIA ID references within one tree; use public
props, callbacks, refs, and role-based automation instead of depending on
internal markup. Fonts remain document-owned, `rem` sizing follows the document
root, `direction` remains inherited, and ancestor layout can still constrain the
host. Shadow-local overlays use the native top layer, and opening a peer popover
dismisses the current peer.

`Textarea`, standalone `VerseActionPopover`, `YouVersionProvider`, and
`BaseYouVersionProvider` remain outside the automatic boundary for their
document-level form, anchor, context, style, or font contracts. The release does
not add runtime rollout controls or phased-release infrastructure.

The release-candidate gates passed in Chromium, Firefox, and Playwright WebKit.
Actual Safari 26.6.2 with SafariDriver 21624.5.1.11.3 on macOS 26.6.2 passed all
38 focused stories in isolated sessions. Safari 26.6.2 with VoiceOver 10 (993)
on macOS 26.6.2 kept all seven required journeys usable; opening the chapter and
version pickers did not announce their dialog context and initial focus until
the next navigation command, a non-blocking finding tracked by
[YPE-6181](https://lifechurch.atlassian.net/browse/YPE-6181). Chrome or Edge with
NVDA was not run because no Windows environment was available; JAWS and mobile
screen readers remain unvalidated. These results do not establish broader
screen-reader support or WCAG certification. See the
[release-candidate evidence](https://github.com/youversion/platform-sdk-react/blob/main/docs/shadow-dom-isolation-plan.md#ype-5952-release-candidate-validation)
for the exact environments and per-journey results.

Shared popover dialogs now derive an accessible name from their visible heading
unless the consumer provides an explicit label. The reader sign-in and sign-out
menu has an explicit accessible name, and the version picker places initial
focus on its language selector.
