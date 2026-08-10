---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Make a failed Bible text load recoverable instead of terminal, and cut the
cold-load request fanout.

A first-load network failure used to leave the Bible Reader, Verse of the Day,
and Bible Card on a permanent "The Bible server couldn't be reached" message.
Nothing retried, and there was no button to press. Four changes fix that.

**Automatic retry.** `useApiData` now retries a failed request on its own, so
most transient failures never reach the user. It retries a timeout, a transport
failure, a 429, and a 5xx. It does not retry a 401, a 403, a 404, or a Zod
validation error. The budget is at most 2 extra attempts and a fixed 20-second
wall clock, whichever runs out first, with jittered backoff. `loading` stays
`true` for the whole chain, so the reader spinner does not flicker between
attempts. Pass `retry: false` to `useApiData` to restore single-shot behavior.

**A "Try again" button.** When automatic retry does not recover, the error
message now renders a retry button. The button appears only for failures a retry
can fix. A 401, 403, or 404 stays a plain final message. `packages/ui` exports
`isRetryableBibleTextError` for the same classification.

**Fewer requests on mount.** `ApiClient.get` now shares one in-flight request
between concurrent callers asking for the same URL and headers. The entry is
dropped when the request settles, so this is in-flight sharing, not a response
cache. `post` and `delete` are unchanged. `YouVersionProvider` now builds the one
`ApiClient` its tree shares, which is what makes that sharing reach sibling
components. Separately, `BibleVersionPicker` waits until its popover opens before
it loads the language and version lists. A cold `BibleReader` mount now issues 3
API requests, down from 18, measured against a production build of
`examples/vite-react`. The 15 it drops are 3 duplicate version and book fetches,
2 language lists, 2 version lists, and 8 publisher lookups the version list
triggered.

**A configurable request timeout.** `YouVersionProvider` accepts a `timeout`
prop in milliseconds. The default is still 10000, so no existing integrator sees
a change.
