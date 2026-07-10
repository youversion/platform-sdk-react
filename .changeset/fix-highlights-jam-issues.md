---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Fix four highlights-stack bugs surfaced by a staging session, plus a fill fade-in.

- **Invisible primary button (ui):** the `default` button variant paired `bg-background` with `text-primary-foreground`, resolving to white-on-white in the light theme (the highlight permission dialog's Continue button was invisible). It now uses the standard `bg-primary` / `text-primary-foreground` pairing. `YouVersionAuthButton` pins `bg-background` explicitly so its neutral brand surface is unchanged.
- **Optimistic overlay dropped before the write is visible (ui):** after a successful highlight write the seam hook dropped the optimistic overlay as soon as ANY refetch landed, trusting it as server truth. Under read-after-write lag (staging slowness, prod read replicas) that GET often did not yet reflect the write, so a highlight flickered out and back on apply, or a removed highlight reappeared. The overlay is now retired only once a fetch actually reflects the write (apply → the verse shows the written color; remove → the verse no longer shows the removed color); until then the overlay wins. Reset paths (chapter/version change, sign-out) release any write the server never converges on.
- **Refetch coalescing (hooks behavior change):** `useHighlights.createHighlight` / `deleteHighlight` no longer refetch on each call. The sole consumer (`useBibleReaderHighlights`) now issues a single refetch after each batch settles, so highlighting verses `[2,3,5]` fires two POSTs but only one GET (previously two).
- **DELETE by range is unsupported (core + ui):** range passage-ids (e.g. `JHN.1.2-3`) returned a non-2xx from staging and threw. The remove path now sends one DELETE per verse (`JHN.1.2`, `JHN.1.3`); POST/apply still collapses to ranges, which works. The `HighlightsClient.deleteHighlight` docstring no longer claims range delete is supported (marked unverified pending API-team confirmation). Large removals issue more DELETEs but still coalesce to a single refetch.
- **Highlight fade-in (core styles):** verse highlight fills now transition their background color (~250ms, disabled under `prefers-reduced-motion`) instead of popping in, matching the Bible app. The selection underline and layout are untouched.
