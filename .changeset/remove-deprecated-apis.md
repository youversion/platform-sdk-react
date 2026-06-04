---
"@youversion/platform-core": major
"@youversion/platform-react-hooks": major
"@youversion/platform-react-ui": major
---

Remove deprecated APIs and tighten `BibleIndex` types (breaking changes).

This major release removes APIs that were previously marked `@deprecated`, plus one type-only tightening. Migration steps below.

**1. `YouVersionAuthButton` — removed the `redirectUrl` prop**

Set the OAuth callback URL once on the provider instead. The per-call `signIn({ redirectUrl })` escape hatch in `useYVAuth` is unchanged.

```diff
- <YouVersionProvider appKey="...">
-   <YouVersionAuthButton redirectUrl="https://myapp.com/callback" />
+ <YouVersionProvider appKey="..." authRedirectUrl="https://myapp.com/callback">
+   <YouVersionAuthButton />
  </YouVersionProvider>
```

**2. `BibleWidgetView` — removed**

The deprecated alias is gone. Use `BibleCard` / `BibleCardProps` (same component, renamed).

```diff
- import { BibleWidgetView, type BibleWidgetViewProps } from '@youversion/platform-react-ui';
+ import { BibleCard, type BibleCardProps } from '@youversion/platform-react-ui';
```

**3. Unused hooks and contexts — removed**

These had zero consumers. Removed from `@youversion/platform-react-hooks`:

- `useInitData` — use `useVersion`, `useBook`, and `useChapter` directly.
- `useChapterNavigation` — use `getAdjacentChapter` from `@youversion/platform-core`.
- `useVerseSelection`, `VerseSelectionProvider`, `VerseSelectionContext` — no replacement; handle verse selection via your own props/callbacks.
- `ReaderProvider`, `ReaderContext`, `useReaderContext` — no replacement.
- `DEFAULT` (the `{ VERSION, BOOK, CHAPTER }` constant exported alongside `useInitData`) was removed with it. If you relied on it, inline the values or use `DEFAULT_LICENSE_FREE_BIBLE_VERSION` from `@youversion/platform-core` for the version.

**4. `BibleIndex` — `passage_id` is now required**

`passage_id` on `BibleIndexChapter` and `BibleIndexVerse` is no longer optional. The API has always returned it; the Zod schema now enforces this at runtime as well, so consumers who relied on the optional field in mock/fixture objects must add `passage_id` to any such literals. `BibleIndexBook.intro` remains optional.
