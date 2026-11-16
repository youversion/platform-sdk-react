# Follow Swift phase 3 Bible rendering across web consumers

For [YPE-6340](https://lifechurch.atlassian.net/browse/YPE-6340), Swift commit
[`5c5167f`](https://github.com/youversion/platform-sdk-swift/commit/5c5167f) is
the source of truth for the typography it changes: introduction titles and
outlines, stanza breaks, embedded lists, right-aligned paragraphs, and the
`\k`, `\sls`, and `\iqt` character styles. This applies where older React CSS
documents a different intentional choice, such as the left-aligned introduction
titles that are now centered and `\k` that is now bold without italics.

As in [ADR 0009](./0009-follow-swift-phase-2-bible-rendering.md), match these
behaviors with browser-native CSS, check them visually rather than for pixel
equality, and use deterministic examples for every changed class plus
representative left-to-right and right-to-left passages.

Keep the existing CSS major and `/platform/1/bible.css` URL, and release the
change as a patch. It corrects Bible text styling to its Swift-defined behavior
rather than introducing an incompatible styling contract, so CDN consumers
receive it with the next UI package release. This classification applies to
YPE-6340 and does not change the general CSS release policy in `PUBLISHING.md`.
