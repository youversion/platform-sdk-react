---
'@youversion/platform-react-ui': patch
---

Fix the `BibleCard` error state announcing two alerts, and keep the version picker usable while an error is showing. The "Error" label stays in the header slot but drops its `role="alert"` and `aria-live`, leaving the message block in the card body as the only alert region. The picker no longer disappears on error, so a 404 has an in-card fix: switch to a version that carries the passage.

The shared message block also drops a redundant `aria-live` and hides its icon with `aria-hidden`, so `VerseOfTheDay` and standalone `BibleTextView` pick up the same accessibility fixes. Their visible text is unchanged, and neither gains an "Error" label. The eight status-aware messages, their six locales, and how errors are derived are untouched.
