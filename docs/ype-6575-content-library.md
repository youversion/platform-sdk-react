# YPE-6575 implementation scope and evidence plan

Scope and browser test boundaries approved by the user. The library is now integrated locally with PR #496; the user has authorized commit, push and PR creation after verification. Jira remains unchanged.

Ticket: https://lifechurch.atlassian.net/browse/YPE-6575
Title: [React SDK] Add image browsing and search to Content Library
Original checkpoint branch: 6575-content-library-browse-and-search at c327908.
Integration branch: codex/YPE-6575-content-library-integration.
Navigation foundation: PR #496, feat/ype-6574-example-app-navigation at 27ae317368aed54e6583232fde6c81a9afd396aa.
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

Required outcomes: all tracker requirements above remain required. The image library uses PR #496's Content destination, hash routes, preserved screens and reader-command adapter. The original 6575 branch is preserved; integration merges the pinned navigation foundation on a separate branch. No changes are made to the other developer's branch. Read in Bible carries the resolved version and passage, including when Bible mounts for the first time. Container scroll, Back/Forward, direct links, interrupted requests and transient dialogs are verified through the running app. Commit, push and create the PR only after verification and independent review; leave Jira unchanged.


Approved Swift reference alignment: content-language selection, language-aware image requests and Bible resolution, partial search-hit retry, passage-stack pagination, selected-image URL sharing, and reduced-motion support. These are implementation details supporting the existing outcomes, not unrelated new screens or SDK capabilities.

Permitted support: sample-local components, styles and request state; browser workflow test configuration and fixtures; reuse existing Core, hooks and UI exports; use existing BibleCard/scripture rendering; a no-release changeset; a concise integration handoff. No SDK package change is currently indicated. Any demonstrated missing Core support belongs to the separate prerequisite ticket.

Non-goals: implementing YPE-6574; video tabs, playlists or playback; authentication fixes; a general navigation/UI overhaul; new public SDK APIs; copying Swift-only architecture.

## Implementation decisions grounded in the reference

- Use Swift's 18 content-language tags: en, es, fr, de, it, ja, zh, ru, pt, ko, hi, ar, tr, nl, sv, zh-CN, zh-TW, zh-HK. Default to en, matching Swift. Display and sort language names using the app locale; allow filtering by name or tag. Keep this picker within the image library in Content; no video or global media-language shell is introduced.
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

Seam N: real running-app Content → image → Bible navigation, plus the isolated passage/version callback harness. Uses the actual hash router, kept screens, reader-command adapter and BibleReader.

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
| 13 | description | Support Read in Bible | N | Verify callback and real reader passage/version, including a cold first mount |
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
| 32 | description | Integrate with Content navigation from 6574 | N | Content detail/hash history, reader navigation and preserved screen state browser workflows |
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

Independent simplification/reviews follow the jira-to-pr skill. The user has authorized push and PR creation after the review fixes and verification. Do not modify the other developer’s branch, message its developer, or change Jira.


## Local handoff

User terminal condition: deliver a verified PR after the review fixes. Do not merge or move Jira to review.

The image library is mounted in Content. `ImagesPage` receives the opaque routed image ID, an image-selection callback and active-screen state. Its Read in Bible callback carries passage ID and resolved Bible version ID to the existing reader-command adapter. The callback harness remains supplemental evidence; real main-app reader navigation is now directly verified.

Code remains in the example. No SDK package or public exports change. PR #496 remains unmerged upstream; this local integration is pinned to its head 27ae317. Its routing implementation, reader adapter, destination navigation, navigation presets, Profile, Bible reader page and route tests are unchanged.


Browser tests: `pnpm --filter vite-react test:e2e` after `pnpm exec turbo build --filter=@youversion/platform-react-ui`. Fixtures intercept HTTP and artwork responses. They do not validate live API availability or the native OS share sheet; they verify its selected-image URL payload.

Verification completed locally:

- `pnpm build`: passed (Core, hooks, UI and example).
- `pnpm test`: passed: Core 352, hooks 200, UI 622; 2 opt-in Core live tests skipped.
- `pnpm lint`: passed without suppressions.
- `pnpm typecheck`: passed.
- `pnpm --filter vite-react build`: passed after final example edits.
- `pnpm --filter vite-react test:e2e`: passed before integration, 13 Chromium workflows; integrated results are recorded below.
- Desktop grid, desktop viewer and narrow-screen viewer captures inspected. The mobile viewer header was adjusted after visual inspection.

**Historical pre-integration checkpoint mapping (13 workflows).** The browser workflows in `examples/vite-react/e2e/images.spec.js` are the executable evidence. The following mapping supplements the planned ledger above; it does not convert manual or deferred items into automated proof.

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
- Picker name/tag filtering and locale-dependent sorting use Intl. Not every language/locale permutation is independently asserted; malformed configured locale is separately exercised.
- Native OS share-sheet presentation, live API smoke, and Firefox/WebKit have not been verified.
- 13 (main Bible navigation) and 32 are now exercised with the pinned PR #496 foundation; upstream merge/hosting CI remain outside this local run.



## Simplification audit

Read-only clean-context gpt-6.2-sol / medium audit of implementation checkpoint 778cfa8 covered all 19 files and 31 diff hunks. Worktree and HEAD remained unchanged. All three recommendations passed correctness, necessity and scope gates: use a ref for the non-rendering scroll offset; keep browse page data local instead of a dummy search assignment; replace manually captured promise resolvers with the repository's existing Promise.withResolvers pattern. No lifecycle paths were combined and no new abstraction was introduced.


## Independent local review and dispositions

Three read-only clean-context audits reviewed checkpoint `09c55b0` against `f4a3ddb`, fingerprint `9bd18659edf4bc4a3002381c27baced66edc45ea0f832cf16e2d005ddae9b766`. Standards used gpt-6.2-sol / medium; Spec and Compatibility used gpt-6.2-sol / high. Each inventoried the complete diff and left HEAD and the worktree unchanged.

### Standards

- Required: synchronize stale-search and stale-language checks with the old response and a browser render opportunity. Applied.
- Required: make exact cursors and English-version preference falsifiable, and validate order when metadata arrives out of order. Fixtures now reject wrong cursors/versions, offer an alternative English Bible, and gate metadata completion. Narrow claims about unasserted permutations rather than treating shared mechanisms as exhaustive tests.
- Required: use an empty-results status contract instead of English prose assertions. Applied.
- Required: expose the selected language in the trigger's accessible name and restore focus to the opened grid card on return. Applied and long-grid focus assertion added.
- Judgment findings: no new domain types or generic lifecycle abstraction justified. Deduplication was extracted only when the retry fix introduced a third use of the identical append behavior. Repetitive error formatting and minor fixture naming are non-blocking follow-ups.

### Spec

- Required: keep previously loaded stack pages and selection when retry fails on an earlier page. Retried prefixes merge into the visible stack; a shorter replacement discards cards only after its complete pagination walk succeeds. A three-page failure/retry workflow reproduced the old defect and now passes.
- Required: preserve the loaded outgoing artwork and drag-release transform through a shuffle. Stack cards now keep stable image elements, and animation starts at the release position. A browser check asserts retained DOM identity and first-frame geometry.
- Required: contain mixed-aspect artwork inside each card without cropping. Stack geometry is bounded with object-fit containment; a landscape/portrait workflow reproduced the previous overflow and now passes.
- Required: reject structurally invalid image passage IDs before resolving a Bible or emitting Read in Bible. Uses the existing Core parser; malformed metadata is exercised through the browser harness. A transient passage-preview network failure alone is not treated as an invalid routing target, consistent with Swift.
- Evidence: added real vertical touch scrolling, exact long-grid focus/scroll, and a direct comparison against the Figma library group (node `5458-11641`) and Jira's attached Swift screenshot. The grid follows the pill search and artwork/reference hierarchy; mobile uses two columns, desktop three; viewer preserves artwork, attribution, scripture and reading action. The later integration below supplies the navigation foundation.

### Compatibility

- Required: avoid unguarded URL.canParse in the existing Vite browser target. Replaced with URL-constructor try/catch; test removes URL.canParse entirely.
- Required: normalize malformed configured locale and fall back safely before Intl formatting. Applied; a separate run exercises en_US.
- Required support: pin browser-server base to `/` and stub public font CSS/CDN requests. Applied; the compatibility run inherits the hosted demo base path to verify isolation.
- Required documentation: replace the retired Images smoke-page description and document the browser command/callback in the example README. Applied.

All source fixes remain within the approved independent-library scope. None implements 6574, video UI, authentication changes or a published SDK API. Additional combinations (every locale, every allowed-version policy and native OS share UI) are verification limitations, not claims of exhaustive coverage. The subsequent integration below supplies the formerly deferred Content/Bible navigation evidence.


## PR #496 integration

User approved integration after a read-only merge simulation. Both histories share f4a3ddb. A new branch preserves the original c327908 checkpoint and merges 27ae317. The three Git conflicts were resolved deliberately:

| File | Preserved intent |
| --- | --- |
| ImagesPage.tsx | #496's routed image ID and opaque-ID deep links, plus the full browse/search/detail library from 6575 |
| package.json | Both the four route tests (`test`) and browser workflows (`test:e2e`), plus the existing pinned Playwright dev dependency |
| README.md | #496's four-destination map and history/state model, updated Content behavior and browser test instructions |

Semantic integration changes are limited to the image library and its App boundary: resolved version ID reaches the existing reader command; detail is driven by the hash route; active-screen state closes body portals and invalidates obsolete work without discarding loaded data; scroll restoration uses the Content scroll owner, with document scrolling only for the standalone harness. A completed artwork stack stays loaded across active-screen changes; interrupted requests resume with their original cursor.

The original route parser, reader-command adapter, destination navigation, navigation presets, Profile, BibleReaderPage and route test files are byte-identical to 27ae317 (verified with `git diff --exit-code 27ae317 -- <paths>`). They are not replaced with 6575 implementations.

**Historical integration merge checkpoint (18 workflows; cold-reader version 3034).**

| Added/updated running-app workflow | Evidence |
| --- | --- |
| Content image routes preserve the grid through detail history and direct links | Open/back/forward/back-to-grid URL assertions and a cold opaque ID containing slash/space |
| Read in Bible uses the selected language and preserves loaded Content state on return | Actual BibleReader renders version 500, full chapter JHN.3; Back restores Spanish, submitted query and both loaded search pages; Profile round trip preserves them |
| Cold image links open Bible before its first mount, and hidden Content closes its dialogs | Actual first reader mount renders 3034 JHN.3; browser Back closes language picker; leaving with viewer open removes the body dialog |
| Missing image links recover without a browse result and reject an obsolete detail response | Detail 404 retry succeeds while list is empty; delayed obsolete ID response cannot replace a later route |
| Returning to Content resumes an interrupted page without applying the hidden response | Leave during Load more, finish the old response while hidden, return and observe a resumed page with the correct artwork |
| Existing long-grid and touch workflows updated to the real app | Restore Content container scroll and originating card focus; vertical touch scrolls that container without shuffling |

`pnpm --filter vite-react test` passes all four unchanged route tests. `pnpm --filter vite-react exec tsc -b` and example oxlint pass. `pnpm --filter vite-react test:e2e` passes 18 Chromium workflows. Full integrated checks pass: `pnpm build`, `pnpm test` (including all four unchanged route tests), `pnpm typecheck`, `pnpm lint`, example tsc and Prettier. Clean-context audits follow the local merge checkpoint before handoff.

## Integration simplification and regression checks

A clean-context gpt-6.2-sol / medium read-only simplification audit of `a76f84f` against `27ae317` covered all 21 changed files and 45 hunks without changing the snapshot. All three recommendations were accepted after independent inspection: merge each new passage page into visible state rather than repeatedly merging the cumulative prefix; keep search IDs in insertion-ordered Set storage; remove stack CSS declarations already supplied by the base card and inline styles. These preserve first-seen ordering, retained retry results and animation geometry without adding abstractions.

Two additional browser checks reproduced concrete integration defects before their fixes:

- A shorter successful retry removed an outgoing card during its shuffle (retained image DOM assertion failed). The flight now retains its artwork snapshot until animation completion, then releases the card and enables another shuffle.
- Browser Forward from a restored long grid left detail scrolled down 351px (expected 0). Detail route transitions now reset the Content scroll container; returning to the grid still restores the exact previous scroll position and originating-card focus.

Both checks pass after the fixes. Full verification of this checkpoint: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter vite-react exec tsc -b`, and all 19 Chromium workflows. The full integrated unit suite passed at the merge checkpoint; these subsequent changes are example-only and directly covered by the browser suite. Native OS sharing, live service availability, Firefox/WebKit and continuous real-device animation smoothness remain unverified.


## Review-fix pass after the pause

The user resumed work and authorized commit, push and PR creation when ready. PR #496 is still open at the pinned head; the PR should target its branch to isolate 6575.

Required findings accepted from the independent audits of 33c2800:

- Standards S1 / Compatibility 1–3: restore real hash anchors and native modified/middle-click behavior, focus a stable detail region, and retain grid scroll independently of card clicks. The long-grid workflow observes href, keyboard entry focus and Tab order, direct hash entry and exact return offset.
- Standards S2: match pointer IDs on move/up/cancel. The mixed-aspect workflow reproduces a secondary pointer advancing the primary gesture before the fix, then verifies the primary drag still completes.
- Spec 1: distinguish a provided empty passage from an omitted search passage. Both empty and malformed IDs remain disabled in the viewer while valid artwork loads without URL.canParse.
- Spec 2: the running full-viewer failure reproduced retry clipping by about 17px. Reserve a usable loading/error surface independently of the failed image's intrinsic size; verify the control bounds, activation, full-rendition recovery and thumbnail recovery separately.
- Spec 3: expose a selected-image link when native sharing rejects. Cancellation remains silent; policy failure produces an error and a usable selected-image fallback.
- Standards S6/S8 and Spec evidence gaps: strengthen existing workflows for exact browse/search identities and cross-page order, overlapping search hits, nonempty rapid-query replacement, picker exclusions, disabled double activation while a page is pending, language reset after pagination, settled stale responses, visible outgoing artwork and removal after flight, full-rendition URL, draft clearing and nondefault cold-reader version 777. These provide evidence at the approved browser seam without adding a test-only SDK API.

Other findings were scope-gated: cross-browser/native OS/live-service behavior remains a disclosed validation limit, not a reproduced defect. Explicit HTTPS sink validation has no demonstrated exploit (React sanitizes script hrefs; Web Share validates schemes); eager-image optimization, aggregate thumbnail announcements, broader locale/version permutations and CI step naming are follow-ups. Preference-only domain/lifecycle abstractions and file splitting are rejected as unnecessary churn. The evidence ledger is retained because the workflow requires durable requirement traceability; it is not additional product scope. Cache freshness and inheriting a direct image's language are unrequested alternatives to Swift's cached image/current content-language behavior.

The original mapping above describes historical checkpoints. Current browser coverage adds explicit disabled double-activation evidence for row 52, cross-page language reset for row 37 and filter exclusion for row 35. English 3034 preference is asserted in the browse/search workflow rather than the shuffle workflow. Source inspection supplies dependency direction and exact unmodified App-to-reader passage forwarding; main-app reader rendering plus the exact callback harness are complementary evidence, not a claim that every verse-scroll permutation is independently tested. Continuous real-device smoothness and unsampled animation frames remain manual limits.

Post-fix verification: `pnpm build`, `pnpm test` (Core 352, hooks 200, UI 622, example routes 4; two opt-in Core live tests skipped), `pnpm lint`, `pnpm typecheck`, example `tsc -b`, and Prettier pass. All 19 browser workflows pass against the stable source snapshot. Normal narrow viewer capture was inspected again. Full source checks precede a fresh clean-snapshot independent review; remote CI is still pending publication.


## Final bounded review-fix pass

Fresh c83bbee audits: Spec found no concrete defect or scope creep; Compatibility found no blocker. Standards findings D1–D4/D6/D8 received scoped fixes or stronger evidence: foreground-colored focus outlines; uniquely keyed rapid replacement search; exact resumed cursor and opaque image ID; all four image bounds plus object-fit; retained card IDs with no repeat search; actual scroll-owner width; descriptive thumbnail retry names without per-thumbnail live loading/alert repetition; and normal-motion Next focus. The actual browser regression reproduced focus loss before replacing native disabled with aria-disabled plus the existing flight guard, preserving both focus and duplicate-shuffle prevention.

Standards D5 is addressed by locally labeling historical evidence tables and following the repository's ticket-free subject/title convention for subsequent commits and the squash title. Previously committed subjects are not rewritten solely for metadata on this squash-bound branch. D7 transport policy and H1–H6 design/performance observations remain nonblocking follow-ups or rejected preference refactors: no concrete exploit, runtime performance defect, missing domain type or need for a generic lifecycle/paging abstraction was established. The three independent audit reports remain separate; none substitutes for another.

The final browser run passes all 19 workflows in 28.1s with the stricter assertions. This is the second bounded review-fix pass; a fresh final audit follows its clean commit. Remaining missing permutations in the Spec report are validation limits, not concrete tracker defects: additional input devices, unsampled frames, retry/token/version permutations, optional clipboard, and every loading surface. The confirmed browser and manual seams, source inspection of unchanged adapters and direct assertions cover the required outcomes without expanding the ticket into exhaustive platform testing.

## Published CI follow-through

PR #498 targets PR #496's pinned branch. Its first CI run exposed two tooling prerequisites that local populated builds masked: root lint built only Core/hooks while new example types came through the UI barrel; the new browser job's ubuntu-latest resolved to Ubuntu 26.04, unsupported by Playwright 1.56.1. Reproduced the same three unresolved-type lint errors with UI dist moved aside, then confirmed standalone lint restores UI and passes after making its prerequisite include UI. The browser job is pinned to supported Ubuntu 24.04, consistent with the existing browser containers' Noble release. No lint rule is disabled, dependency is upgraded, or application behavior changed. The initially cancelled signoff evaluation was superseded by a successful evaluation, not a release-gate defect. CI must be rerun on this tooling follow-up.

## Approved overlapping-gesture fix

The user approved one additional narrow fix pass after the final audit independently reproduced a drag during an active flight opening the viewer (actual App: one dialog while a flight remained). The existing shuffle/share workflow now directly checks release during a paused flight and release after that flight completes. Gestures record whether shuffling was available when they began: blocked gestures suppress their trailing click and stay blocked through completion; they do not move or advance the selected card. Subsequent normal drag, keyboard focus, selected sharing and viewer opening remain exercised. Both timing cases failed before their corresponding fixes; all 19 workflows pass afterward (48.1s). PR #498 was held as a draft while this defect was addressed. The other tracker scope and previously documented nonblocking follow-ups are unchanged.

## Approved replacement cleanup

The user approved a further narrow pass for two reproduced shorter-replacement cases: an outgoing seed becoming the selected fallback mid-flight, and a dragged selected card being removed before pointer release (the fallback retained 110px of translation). The stack now clears gesture ownership/offset when the selected ID changes and cancels a flight only when its outgoing image has become the selected fallback. A layout effect makes that cleanup occur before paint, retaining other outgoing-card flights and the prior overlap behavior. The new two-part running-app workflow checks centred, usable fallback artwork during the flight, after release outside the removed card and after hover; both branches failed separately before cleanup. All 20 browser workflows pass (30.2s), including the retained-outgoing and overlapping-gesture regressions. No SDK or unrelated navigation behavior changes.
