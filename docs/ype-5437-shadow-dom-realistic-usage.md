# YPE-5437: Shadow DOM realistic usage

## Recommendation

The shared `ShadowRootHost` is reliable enough for YPE-5356 to continue defining
the rollout policy. This spike found no shared-host blocker. It does not approve
automatic isolation for any additional public component; each rollout candidate
still needs its own compatibility, browser, accessibility, and performance review.

## Browser fixture

The production Storybook fixture renders 12 real UI components together:

- one `BibleReader`;
- two `BibleCard` instances;
- two `VerseOfTheDay` instances;
- two `ProfileAvatar` instances;
- three `Textarea` instances; and
- two `Separator` instances.

This mix represents a content page with repeated scripture, profile, and form
UI without inventing a stress-only component count. `YouVersionAuthButton` is
not included because it already creates its own boundary; wrapping it would
test nested isolation instead of the shared-host usage in question.

The Normal and Strict Mode stories mount, remove, and re-add the complete mix.
Focused Chromium coverage verifies that every cycle has exactly 12 hosts and
component-specific output in each root, including scripture content, avatar
labels, textarea values, and separators. The lifecycle produces no console
errors. It also verifies that every `ShadowRootHost` in the Storybook document
adopts the exact same `CSSStyleSheet` object, including after the complete mix
is removed and re-added.

## Mount-cost observation

For the one-time comparison, a temporary harness rendered the same mix either
through `ShadowRootHost` or directly under `[data-yv-sdk]`. It measured from the
action that started a fresh keyed mount through the layout-effect commit of the
final fixture item. API hook results and the font response were stubbed locally,
so the observation was about mounting the component tree rather than network
response time. The timing harness was removed after the observations were
captured; it is not a permanent benchmark.

The production Storybook build was served locally and exercised in headless
Chromium 141.0.7390.37. Separate fresh pages captured each cold observation.
After one warm-up of each mode, six alternating observations produced:

| Mode | Observations (ms) | Median |
| --- | --- | --- |
| Isolated | 147.6 cold; 19.5, 19.1, 16.4, 17.9, 16.3, 15.9 warm | 17.2 warm |
| Without isolation | 53.4 cold; 15.4, 13.7, 12.0, 12.8, 12.4, 11.6 warm | 12.6 warm |

The cold isolated observation includes the document's one-time shared
stylesheet construction. Warm observations show a small single-digit
millisecond difference on this machine, with no errors or growth in stylesheet
instances. That is not a product performance budget or a broad device result,
so the comparison remains a manual diagnostic rather than a CI threshold.

## Handoff to YPE-5356

No focused follow-up ticket is needed from this spike. YPE-5356 can proceed on
the basis that the shared host handles this realistic same-document quantity,
reuses its stylesheet, removes every host, and re-adds the correct mix without
console errors in Normal and Strict Mode. Rollout decisions must still evaluate
the selected component's public contract and user-visible performance in its
intended layout.
