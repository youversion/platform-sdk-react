---
'@youversion/platform-react-ui': minor
---

`BibleCard` now caps its painted shell at 700 px by default — one measure that
the header, scripture, and footer share, matching the Swift SDK — instead of
stretching to fill a wide host. The card still fills a narrower host and centers
itself in a wider one.

A new optional `maxWidth?: number | '100%'` prop controls the cap:

- Omit it for the default 700 px shell; the inner column fills that shell (only
  the card's padding is the inset).
- Pass a number to cap the shell at that many CSS px; the inner column fills it.
- Pass `"100%"` for a full-bleed shell that fills its parent; the inner text
  column then stays capped at 600 px so scripture keeps a column.

Breaking for full-bleed layouts: hosts that relied on `BibleCard` growing to
fill a wide container must now pass `maxWidth="100%"`.
