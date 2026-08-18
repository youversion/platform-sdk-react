---
'@youversion/platform-react-ui': minor
---

`BibleTextView`, `BibleCard`, and `VerseOfTheDay` now auto-paint the signed-in user's highlights from the API when the `highlights` permission is granted (Swift-like default). Omit the prop for that self-contained path. Passing `highlights` (including `[]`) stays controlled so React Native hosts can keep the token out of the WebView.
