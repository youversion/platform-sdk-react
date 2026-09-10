# Passage display API

## Purpose

`getPassageDisplay` gives non-React web applications one supported operation
for retrieving transformed Bible HTML, current display attribution, and the
resources required to apply YouVersion's Bible presentation. The result is
declarative and works with browser frameworks, server-rendered templates, and
plain JavaScript.

The operation complements the granular `getPassage` and `getVersion` methods;
it does not replace them.

## Public API

```ts
type GetPassageDisplayOptions = Readonly<{
  versionId: number;
  passageId: string;
  includeHeadings?: boolean;
  includeNotes?: boolean;
}>;

type PassageStylesheet = Readonly<{
  kind: "bible" | "font";
  rel: "stylesheet";
  href: string;
}>;

type BiblePassageDisplay = Readonly<{
  passage: BiblePassage;
  version: BibleVersion;
  html: string;
  attribution: {
    text: string;
    source: "copyright" | "promotionalContent";
  };
  stylesheets: readonly PassageStylesheet[];
  containerAttributes: {
    "data-yv-sdk": "";
    "data-slot": "yv-bible-renderer";
  };
}>;

const display = await bibleClient.getPassageDisplay({
  versionId: 3034,
  passageId: "JHN.3.16",
  includeHeadings: true,
  includeNotes: true,
});
```

The module also exports `getPassageDisplay(client, options)` for the
tree-shakable functional API, `getBibleStylesheets(config)` for applications
that install global resources once, and stable constants for the Bible CSS URL,
Untitled Serif font ID, and container attributes.

## Behavior

- The operation always requests HTML and always transforms it. Callers that
  need text or raw API HTML use `getPassage`.
- Passage content and Bible version metadata are fetched concurrently when the
  active version filter can decide from the numeric id alone.
- A language filter requires version metadata. In that case, the version is
  validated before Scripture is fetched, and that same response supplies the
  display model. No duplicate metadata request is made.
- Attribution is freshly requested for every operation and is never cached by
  this API.
- Non-empty `copyright` is preferred. Non-empty `promotional_content` is the
  fallback. If neither exists, `MissingPassageAttributionError` rejects the
  operation so a caller cannot receive a display-ready passage without legal
  text.
- The font stylesheet URL uses font ID `1`, respects the configured API host,
  and URL-encodes the app key. Untitled Serif is the intended first-choice font;
  Source Serif 4 remains the CSS fallback.
- The operation does not create elements, inject stylesheets, mutate global
  state, or cache data.

## Environment behavior

Browser transformation uses the platform `DOMParser`. Server transformation
uses the existing dynamic `jsdom` path and therefore requires the documented
optional peer dependency. Zero-configuration server dependency design is a
separate concern and does not expand this API.

## Failure behavior

HTTP, timeout, input-validation, version-filter, and transformation failures
flow through their existing paths. Missing attribution throws
`MissingPassageAttributionError`, which exposes:

```ts
readonly code = "missing_passage_attribution";
readonly versionId: number;
```

## Non-goals

The first version does not expose text format, raw HTML, transformation opt-out,
theme selection, CSS overrides, DOM targets, resource injection, cache policy,
or transformer dependency injection.
