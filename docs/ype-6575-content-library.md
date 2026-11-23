# YPE-6575 implementation scope and evidence plan

Scope and test boundaries approved by the user. Implementation and evidence are recorded below.

Ticket: https://lifechurch.atlassian.net/browse/YPE-6575
Title: [React SDK] Add image browsing and search to Content Library
Branch: 6575-content-library-browse-and-search
Base: main, f4a3ddb604e4f30b4eb5e9705907c3edc2d99819
Initial worktree: clean.

## Sources

Jira requirements source: `description`. `customfield_10064` (Acceptance Criteria) is an empty document. No constraining comments or issue links were returned. The description names YPE-6574 as the navigation dependency.

Swift reference: https://github.com/youversion/platform-sdk-swift/pull/302 pinned to bba84a36a60fe71dc95cc5815de5322423299980. Read ContentImagesView.swift (including ContentImageView and ContentImageViewer), VotdImageStackView.swift, VotdImageView.swift, ContentLanguage.swift and ContentLanguagePicker.swift, plus the ContentView.swift patch. Swift PR 302 is stacked on YPE-6044-sample-tabs. Its video and authentication changes are outside this ticket.

## Tracker requirements (faithfully normalized)

Extend Content from the tab-reorganization ticket into an image Content Library, following Swift PR 302.

- Browse verse-art images in a paginated grid; search by text, clear search, and load more.
- Resolve lightweight search hits into image details while preserving server order.
- Open an image detail/stack with additional artwork for its passage, full-screen display, attribution and passage text.
- Share the currently selected image and support Read in Bible.
- Show loading, empty and retry states. Image download failures must be visible independently of metadata failures; background stack cards are decorative.
- Preserve loaded cards on later-page failure. Retrying or replacing a shorter result set must keep selection valid. Deduplicate repeated pages without reordering.
- Cancel obsolete work / reject stale results when search or navigation changes. Verify rapid search changes, failed later pages, successful retry, missing art, and sharing after swiping.
- Verify drag-to-shuffle and tap-to-shuffle; avoid z-order flashes and abruptly disappearing cards. Use ordinary platform animation conventions.
- Use existing image APIs where available; add missing Core support through ticket 1. No video UI. Do not copy unrelated authentication fixes or expand into a general UI overhaul.
- Use the attached Swift screenshot for image detail and the linked Figma design for the broader grid/navigation reference.
- YPE-6574 supplies the navigation foundation.

## Scope contract

Required outcomes: all tracker requirements above remain required. Implement the independent image library now in the existing Vite demo Images destination. Leave YPE-6574's Content/Examples navigation to its developer. Provide a local callback carrying the resolved Bible version and passage for later integration; verify it independently now. Final Content navigation, main Bible routing, back navigation and state-preservation verification remain pending YPE-6574. Do not mark the ticket complete or the PR review-ready while required integration remains incomplete.

Approved Swift reference alignment: content-language selection, language-aware image requests and Bible resolution, partial search-hit retry, passage-stack pagination, selected-image URL sharing, and reduced-motion support. These are implementation details supporting the existing outcomes, not unrelated new screens or SDK capabilities.

Permitted support: sample-local components, styles and request state; browser workflow test configuration and fixtures; reuse existing Core, hooks and UI exports; use existing BibleCard/scripture rendering; a no-release changeset; a concise integration handoff. No SDK package change is currently indicated. Any demonstrated missing Core support belongs to the separate prerequisite ticket.

Non-goals: implementing YPE-6574; video tabs, playlists or playback; authentication fixes; a general navigation/UI overhaul; new public SDK APIs; copying Swift-only architecture.

## Implementation decisions grounded in the reference

- Use Swift's 18 content-language tags: en, es, fr, de, it, ja, zh, ru, pt, ko, hi, ar, tr, nl, sv, zh-CN, zh-TW, zh-HK. Default to en, matching Swift. Display and sort language names using the app locale; allow filtering by name or tag. Keep this picker within the image library until the shared Content shell exists.
- Filter browse and passage artwork by the selected content language. Image search requires a Bible version ID, not a language parameter.
- Resolve accessible Bible versions using existing filtered getVersions APIs. Prefer 3034 for English only when available and usable; otherwise prefer exact language tags, ordered by ID, then an available candidate. For passage previews, require that the version contains the passage's book. Follow pagination so later valid candidates are not missed.
- Match Swift's Chinese fallbacks: zh-CN then zh; zh-TW/zh-HK then zh-Hant then zh. Never fall back silently to an unrelated language or bypass integrator version filters.
- If no usable Bible exists, show a recoverable error for search or passage preview. Artwork browsing remains independent of Bible-resolution success. Enable Read in Bible only with a valid resolved passage/version.
- Preserve successful image metadata on partial search-hit failures, retry unresolved hits, and reconstruct the visible results in original server order. Advance the page only after its pending metadata resolves.
- Start a passage stack with the image the user opened. Fetch further passage pages, preserve cards on later failure, deduplicate IDs and detect repeated continuation tokens. Preserve selection by image ID, with a valid fallback if replacement removes it.
- Share the selected image URL, matching Swift ShareLink behavior. Native file-byte sharing/download is not an additional requirement. Provide a sensible web fallback and visible sharing errors.
- Use a keyboard-accessible full-screen viewer; hide decorative cards from accessibility and interaction. Reduced-motion users get immediate selection changes without card flight animation.
- Reject stale results on query, language, detail navigation and unmount changes. Existing clients do not expose per-call AbortSignal in these methods; use stale-result rejection rather than expanding Core for cancellation.

## Light review corrections

- Keep draft search text separate from the submitted query, as Swift does. Trim submitted queries, treat blank submissions as browse, and validate the 100-grapheme limit without silently truncating. Invalid input must not discard the existing results. Clear must invalidate any pending search immediately.
- Treat only `null` as the end of search pagination: React's search API preserves an empty-string continuation token. Keep the original submitted query, version and page size for every page. Prevent duplicate concurrent Load more requests. A failed request must not consume its cursor. A successful page that repeats an already-consumed cursor must stop safely instead of looping.
- Open detail with the chosen grid image visible immediately, even if additional passage artwork fails. Test single-image and empty additional-artwork cases. Returning from detail must preserve loaded grid cards, submitted query, language and list position within this image library; only cross-tab navigation integration waits for 6574.
- Separate the two tap actions clearly. Swift's Content stack opens the viewer when the selected artwork is tapped; it shuffles on drag, and its reusable stack supports tap-to-shuffle in another mode. For the web, preserve artwork tap-to-open and provide a distinct, keyboard-accessible shuffle button. Avoid nested controls, accidental viewer opening after a drag, and hijacking vertical page scrolling.
- Re-key or control the existing BibleCard by resolved version and passage: `versionId` alone seeds its state and does not update it after mount. Verify non-English previews after changing language; never show a stale Bible version. BibleCard renders passage errors but exposes no retry callback, so provide a local retry/remount path for failed previews without changing its public API.
- Distinguish share-sheet cancellation from a failed share. If Web Share is unavailable, provide an explicit image link (and copy when supported); do not require native file sharing. Capture the selected image URL when the user invokes Share, and verify the full-screen share action too.
- Reuse the installed Radix dialog primitive for focus containment, Escape dismissal and focus restoration. Check keyboard-only shuffle/viewer use, touch scrolling and a narrow viewport. Use logical CSS properties. Match aspect ratios and avoid cropping verse text out of artwork. Inspect image detail against the attached screenshot and grid/navigation styling against Figma; do not copy unrelated page structure.
- Keep browser tests in the example, using the repository's existing Playwright version if a direct test dependency is needed. Make their command reproducible and run it in CI; do not change SDK exports to expose hooks just for this example. Group ledger assertions into a few meaningful end-to-end workflows rather than creating one test per ledger row.

## Evidence ledger

Seam B: browser workflow through the running Vite app, real React rendering and SDK clients, controlled HTTP metadata/CDN responses and browser share capability. Tests exercise visible behavior rather than local component internals. They do not re-test Core schema contracts. No isolation test seam is proposed.

Seam V: browser visual/manual validation with reproducible inputs and recorded outcomes.

Seam N: callback boundary carrying passage ID and Bible version now; final running-app navigation after YPE-6574 becomes available.

| ID | Source | Independently falsifiable requirement | Seam | Planned evidence |
| --- | --- | --- | --- | --- |
| 1 | description | Browse images in a grid | B | Open Images and observe artwork cards |
| 2 | description | Load subsequent browse pages | B | Load more and observe appended cards |
| 3 | description | Search by text | B | Submit a query and observe its results |
| 4 | description | Clear search | B | Clear and return to browse results |
| 5 | description | Resolve lightweight hits into full image details | B | Search response contains only hits; artwork is rendered after metadata fetches |
| 6 | description | Preserve server order | B | Resolve hit metadata out of order and verify displayed order |
| 7 | description | Open image detail | B | Open a grid card and observe detail |
| 8 | description | Fetch additional artwork for the same passage | B | Passage-filtered fixture supplies additional stack cards |
| 9 | description | Display full-screen artwork | B | Open viewer, verify dialog and image, close and restore focus |
| 10 | description | Display image attribution | B | Observe selected image attribution |
| 11 | description | Display passage text | B | Observe passage content through existing scripture component |
| 12 | description | Share the currently selected image | B | Capture share URL after changing selection |
| 13 | description | Support Read in Bible | N | Verify resolved passage/version callback now; main Bible navigation pending 6574 |
| 14 | description | Show loading states | B | Hold metadata and image responses and observe progress |
| 15 | description | Show empty states | B | Return empty browse and search pages |
| 16 | description | Retry metadata failures | B | Fail then retry successfully |
| 17 | description | Show image-byte failures independently | B | Fail CDN response with valid metadata; retry image |
| 18 | description | Background stack cards are decorative | B | Background cards absent from accessible controls and focus order |
| 19 | description | Preserve cards on later-page failure | B | Fail a subsequent page after initial success |
| 20 | description | Selection remains valid after retry | B | Select a card, fail later passage page, retry and observe valid selection |
| 21 | description | Selection remains valid after shorter replacement | B | Replace passage results with fewer cards and verify selected artwork/share |
| 22 | description | Deduplicate repeated pages | B | Return overlapping image IDs and verify unique cards |
| 23 | description | Deduplication preserves order | B | Verify first-seen order after overlapping page |
| 24 | description | Reject obsolete search results | B | Submit rapid searches and deliver old result last |
| 25 | description | Reject obsolete navigation results | B | Leave detail/page before responses settle |
| 26 | description | Sharing follows swiped selection | B | Drag then share; inspect payload |
| 27 | description | Drag to shuffle | B | Pointer/touch gesture changes selected card |
| 28 | description | Tap to shuffle | B | Tap accessible shuffle control and verify selection |
| 29 | description | No z-order flashes | V | Inspect normal and interrupted shuffle transitions |
| 30 | description | Cards do not abruptly disappear | V | Inspect outgoing card completion and rapid gestures |
| 31 | description | Use ordinary platform animations | V | Inspect web transitions and reduced-motion behavior |
| 32 | description | Integrate with Content navigation from 6574 | N | Deferred required final running-app journey when 6574 exists |
| 33 | description/reference | Reuse existing APIs without unrelated auth/video work | review | Inspect changed files and imports |
| 34 | Swift ContentView/ContentLanguagePicker | Select a supported content language | B | Select non-English tag and observe active choice |
| 35 | Swift ContentLanguagePicker | Filter languages by localized name or tag | B | Filter picker and observe matches/empty state |
| 36 | Swift ContentImagesView | Browse requests follow content language | B | Return different artwork for selected languages |
| 37 | Swift ContentImagesView | Language change resets results and pagination | B | Change language after loading later page |
| 38 | Swift ContentImagesView | Reject prior-language results | B | Deliver old-language response after switching |
| 39 | Swift ContentLanguage | Search uses an accessible Bible in the content language | B | Supply multiple version candidates and verify correct search results |
| 40 | Swift ContentLanguage | Prefer usable English version 3034 | B | Supply 3034 and alternatives; inspect search Bible ID |
| 41 | Swift ContentLanguage | Resolve Chinese language fallbacks | B | Regional candidate absent; fallback supplies matching version |
| 42 | Swift ContentLanguage / CONTEXT.md | Respect integrator version restrictions | B | Restricted 3034 omitted by real filtered client; permitted candidate used |
| 43 | Swift ContentLanguage | Preview Bible contains the image passage's book | B | First candidate lacks book; next valid candidate supplies scripture |
| 44 | Swift ContentLanguage | Missing Bible produces an actionable error | B | No candidates; verify error/retry and prevent invalid Read callback |
| 45 | Swift ContentImagesView | Failed search-hit resolution retains successes | B | One hit fails while others resolve; observe retained cards |
| 46 | Swift ContentImagesView | Retry incomplete hits without losing original order | B | Recover failed earlier hit and verify insertion in server order |
| 47 | Swift ContentImageView | Passage stack follows subsequent pages | B | Additional artwork appears after next passage page |
| 48 | Swift ContentImageView | Repeated passage token terminates safely | B | Cyclic cursor causes recoverable error while preserving cards |
| 49 | Swift VotdImageStackView | Reduced motion avoids card flight animation | B/V | Emulate prefers-reduced-motion and verify immediate selection; inspect visually |
| 50 | Swift ContentImagesView / React search contract | Validate submitted query without discarding prior results | B | Submit whitespace and over-limit grapheme input; verify browse/validation behavior |
| 51 | React SearchClient contract | Preserve empty-string search continuation tokens | B | First search page returns an empty token; Load more fetches the next page |
| 52 | description retry/pagination | Retry the failed cursor without duplicate concurrent loads | B | Trigger Load more repeatedly, fail, retry and verify retained plus newly appended cards |
| 53 | Swift ContentImageView | Opened grid image remains visible when extra artwork fails or is empty | B | Fail/empty the passage-art request after opening a card |
| 54 | description/navigation within library | Returning to grid preserves loaded image-library state | B | Load more, open detail, return and verify cards/query/language/list position |
| 55 | Swift ContentImageView / description gesture behavior | Artwork tap opens viewer; shuffle tap changes selection | B | Exercise distinct controls; drag must not open viewer |
| 56 | description passage text / React BibleCard behavior | Preview updates to the resolved Bible version | B | Open previews under different content languages and verify corresponding scripture |
| 57 | description retry states | Failed scripture preview can recover | B | Fail passage request, retry and observe scripture without losing artwork |
| 58 | description sharing on web | Share remains usable without native Web Share | B | Remove Web Share; observe selected-image link/copy fallback; cancellation is not an error |
| 59 | reference visual alignment | Grid/detail follow Figma and attached screenshot | V | Record narrow/wide, aspect-ratio, keyboard, touch and reduced-motion checks |

## Verification and terminal condition

Implement one browser workflow slice at a time, red then green. Run focused browser checks and example typechecking as slices progress. Finish with required pnpm build, pnpm test, pnpm lint, pnpm typecheck, the example build and added browser workflows. Record exact outcomes, manual checks and incomplete evidence.

Independent simplification/reviews follow the jira-to-pr skill. A draft PR may document the remaining dependency, but do not present it as complete, move Jira to review, or claim green/mergeable completion without the pending navigation evidence. Do not modify 6574 or message its developer.


## Local handoff

User terminal condition: stop before creating a PR. Do not push or move Jira to review.

The image library is mounted at the existing Images destination. Its optional `ImagesPage.onReadInBible(passageId, versionId)` callback is the integration boundary for YPE-6574. Without a host callback, Read in Bible is disabled. The browser-only harness verifies the callback with a real filtered Bible client; it does not claim to verify navigation in the main app.

Code remains in the example. No SDK package or public exports change. Add the host callback when 6574's navigation is available, then verify Content entry, reader routing, cross-tab state and back navigation before marking the ticket complete.

Browser tests: `pnpm --filter vite-react test:e2e` after `pnpm exec turbo build --filter=@youversion/platform-react-ui`. Fixtures intercept HTTP and artwork responses. They do not validate live API availability or the native OS share sheet; they verify its selected-image URL payload.

Verification completed locally:

- `pnpm build`: passed (Core, hooks, UI and example).
- `pnpm test`: passed: Core 352, hooks 200, UI 622; 2 opt-in Core live tests skipped.
- `pnpm lint`: passed without suppressions.
- `pnpm typecheck`: passed.
- `pnpm --filter vite-react build`: passed after final example edits.
- `pnpm --filter vite-react test:e2e`: passed, 10 Chromium workflows.
- Desktop grid, desktop viewer and narrow-screen viewer captures inspected. The mobile viewer header was adjusted after visual inspection.

The ten browser workflows in `examples/vite-react/e2e/images.spec.js` are the executable evidence. The following mapping supplements the planned ledger above; it does not convert manual or deferred items into automated proof.

| Workflow | Ledger coverage and assertions |
| --- | --- |
| browse, recover a later page, search in server order and clear | 1–6, 16, 19, 22–23, 52: retained list count after failed later page, unique appended count, selected first search image URL, browse restoration |
| language selection, partial search retries, empty cursors and obsolete searches | 24, 34–39, 45–46, 51: Spanish browse URL and search Bible ID, retained metadata result, original order after retry, empty-token pagination, old query cannot replace cleared browse |
| shuffle, share the selected artwork, view scripture and return to the loaded grid | 7–12, 26–28, 40, 55: selected position after tap/drag, captured share URL at both detail and full-screen seams, passage text and attribution, close focus restoration, restored grid |
| recover artwork, later stack pages and a shorter retry; share without native sharing | 17, 20–21, 47–49, 53, 58: failed selected image retry, retained selection after more artwork, repeated-cursor error, shorter replacement falls back to opened image, no flight under reduced motion, image-link fallback |
| read callback uses a permitted Bible, and failed passage text can be retried | 13 (callback only), 42–43, 56–57: excluded version ignored, candidate lacking passage book ignored, passage retry and exact version/passage callback |
| Chinese fallback, no available Bible, query validation and empty search recovery | 15, 41, 44 (search), 50: over-limit input preserves cards, Chinese fallback selects matching Bible, empty search, missing Bible error with browse recovery |
| language changes invalidate pending browse work; initial errors and empty pages recover | 14–16, 37–38: loading status, failed first page retry, old-language response cannot restore stale cards |
| narrow touch layout and keyboard viewer controls remain usable | 9, 31, 49, 59 (layout): no horizontal overflow at 390px, touch card opening, keyboard shuffle/viewer opening, passage visible and Escape restores focus |
| restore a long grid and render previews in the selected content language | 54, 56: exact list scroll position restored and Spanish/French passage text verified after changing languages |
| leaving a detail view rejects its pending artwork | 18, 25, 53–54: immediate opened image, back restores grid, old passage artwork cannot replace next detail, only selected artwork exposed as an accessible image |

Remaining manual/limited evidence:

- 29–30: inspected outgoing and returning shuffle frames by pausing the browser animation at 180ms and 350ms; the previous card stays visible through its flight and fades behind the selected card. Gesture tests verify selection and prevent an unintended viewer opening. Continuous real-device animation smoothness remains a manual limitation.
- 33: verify scope and dependency direction in the local audit.
- 35: picker name/tag filtering is exercised; locale-dependent sorting is implemented with Intl but not independently asserted for every locale.
- Native OS share-sheet presentation, live API smoke, and Firefox/WebKit have not been verified.
- 13 (main Bible navigation) and 32 remain blocked by YPE-6574. They are required final ticket evidence, not waived criteria.

