---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Add Bible Reader search: one USFM grammar, an exclusive-lane `useBibleSearch` session, and a Toolbar-mounted `BibleReaderSearch` that navigates with transient verse focus.

Expose `BibleReaderNavigation` for host requests before reader mount, passage or full-chapter display, and optional in-place focus. Search supports grapheme-safe input, deduplicated results, verse previews, automatic pagination, and accessible dismissal and errors.

Align search with the reader designs in a toolbar-anchored popover. Show three trending queries and the latest three browser-local recent searches, and preserve query entry and recents when suggestions fail. Load verse previews behind one spinner, keeping earlier results visible during pagination. Result selection moves keyboard focus to the verse; dismissing search with Close or Escape restores the trigger.

Add an async-compatible `BibleReader.Root.onSearchPress` override for host-owned search. Match toolbar popover motion and native scrollbar themes. Correct verse mapping across poetry lines so focus dims the complete surrounding verses without adding a highlight, and retain focus until user interaction.

Add Old Testament, New Testament, and Both search filters using the selected Bible's book metadata. Continue through nonmatching result pages before reporting no results. Display sentence-case references above three-line serif previews with inline verse numbers. Back clears the search and filters without closing the popover; show only one X control at a time.

Give search rows inset hover surfaces without shifting content, align initial search and preview spinners, and reveal loaded previews with a short reduced-motion-aware transition. Reuse existing localized empty-state copy and clear stale failures when changing testament filters.

Start testament controls collapsed behind an accessible Filters disclosure. Preserve and indicate active filtering while collapsed, and reset to Both and collapsed on Back or clear. Expand and collapse the controls with an interruptible accordion transition, immediate keyboard toggles, and fade-only reduced motion.

Keep core imports usable without Intl.Segmenter, falling back to Unicode code-point limits for search on those runtimes. Preserve the generic useDebounce delay for null values while suppressing suggestions in submitted searches. Allow Enter to resubmit failed or empty searches without replaying cached pages or duplicating an in-flight request.

Apply queued reader destinations before fetching passage content, and wait for controlled props to accept pending navigation. Clear activated navigation when the host leaves its destination so returning does not restore stale passage selection or focus. Omit chapter-only search hits while preserving verse ranges and continuation loading.
