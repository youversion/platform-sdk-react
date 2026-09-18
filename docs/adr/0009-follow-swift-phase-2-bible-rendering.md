# Follow Swift phase 2 Bible rendering across web consumers

For [YPE-5825](https://lifechurch.atlassian.net/browse/YPE-5825), the merged
[Swift PR #262](https://github.com/youversion/platform-sdk-swift/pull/262) is the
source of truth for the typography and rendering behavior it changes, including
where older React CSS documents a different intentional choice. Match those
behaviors with browser-native CSS rather than copying Swift-specific layout
workarounds; reader font settings remain unchanged.

Acceptance covers React components and the shared standalone HTML/CSS path.
Keeping the rendering contract shared prevents non-React passage consumers from
diverging. React Native-specific integration changes are outside this ticket;
those consumers can inherit shared renderer improvements.

Footnote changes apply to Bible text styling only. Keep the existing web popover,
lettered rows, verse context, and interactions.

Visual acceptance checks the specified sizes, weights, alignment, spacing,
visibility, and content preservation, not pixel equality between native and
browser text engines. Use deterministic examples for every changed class and
representative passages in left-to-right and right-to-left layouts. Capture
browser results for review; David's review is advisory, not a required merge
gate.

Keep the existing CSS major and `/platform/1/bible.css` URL. This work corrects
Bible text styling to its intended Swift-defined behavior rather than introducing
an incompatible styling contract. Existing CDN consumers should receive the
corrections when CDN publishing is enabled and the updated UI package publishes;
preserving the previous layout behind a new CSS major is not required. This
classification applies to YPE-5825 and does not change the general CSS release
policy.
