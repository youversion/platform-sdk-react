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

The release gate requires Chromium, Firefox, and Playwright WebKit coverage;
Playwright WebKit is not actual Safari. Release documentation may record actual
Safari and assistive-technology results only for the exact browser and
assistive-technology versions validated and must not imply broader screen-reader
support or WCAG certification.
