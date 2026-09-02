# YPE-5528: Split UI dist so a Provider-only import drops unused Bible UI

Ticket: YPE-5528 (Story, 1 SP). Parent: YPE-1193. Related: PR #370.

This spec replaces the earlier glob-vs-curated-list plan. Read it before any code lands.

## Problem Statement

A partner who only mounts `YouVersionProvider` still downloads `BibleReader`, `BibleChapterPicker`, and `BibleVersionPicker`.

Those three are unused. They stay in the bundle because the UI package publishes one JavaScript file. The partner bundler cannot drop a top-level call it cannot prove is pure. `sideEffects` is already correct. Flipping `splitting` on with the current single entry changes no bytes.

## Solution

The UI package publishes a split `dist`. The package root stays the only public import. The three unused Bible components become their own build entries. A partner who imports only `YouVersionProvider` then drops those three.

Prove that with the existing tree-shaking check, not with a smaller root file. Do not compile the components folder. Do not add subpath exports.

## User Stories

1. As a partner who only mounts `YouVersionProvider`, I want unused Bible UI gone from my bundle, so that I do not ship reader and picker code I never import.
2. As a partner who mounts `BibleReader`, I want that component still to resolve from the package root, so that my existing import does not change.
3. As a partner who mounts `BibleChapterPicker`, I want that component still to resolve from the package root, so that my existing import does not change.
4. As a partner who mounts `BibleVersionPicker`, I want that component still to resolve from the package root, so that my existing import does not change.
5. As a partner who imports several UI components from one statement, I want every named export I use to stay present, so that a split build is not a breaking API change.
6. As a partner on Vite, I want chunk files to resolve at build time, so that a real consumer bundler can follow the new graph.
7. As a partner on webpack or similar, I want unused entry files omitted, so that `sideEffects` plus split files is enough.
8. As a partner who `import`s the package, I want the same public ESM export set as today, so that I do not lose a symbol.
9. As a partner who `require`s the package, I want the same public CommonJS export set as today, so that CJS is not a second-class build.
10. As a partner who wraps the tree in `YouVersionProvider`, I want SDK styles and fonts to still inject, so that children keep looking correct.
11. As a partner who sets `locale` on `YouVersionProvider`, I want SDK copy to still resolve, so that the provider path does not regress.
12. As a partner who never imports the reader, I want reader error strings and reader storage keys absent from my bundle, so that I can trust the drop is real.
13. As a partner who never imports a picker, I want that picker’s error strings and storage keys absent from my bundle, so that I can trust the drop is real.
14. As a partner who does import the reader, I want those reader sentinels present, so that the check cannot pass on a stale string.
15. As a partner who does import a picker, I want those picker sentinels present, so that the check cannot pass on a stale string.
16. As a partner who uses `BibleCard`, `VerseOfTheDay`, `BibleTextView`, or `YouVersionAuthButton`, I want those exports unchanged, so that this ticket does not become a general rewrite.
17. As a partner who imports `Separator` or `Textarea`, I want those exports unchanged, so that the two public primitives stay public.
18. As a partner reading npm, I want no test or Storybook files in the tarball, so that a split build does not publish harness code.
19. As a partner reading npm, I want no new public subpath, so that `"./bible-reader"` does not become API.
20. As CI, I want a Provider-only fixture in the tree-shaking check, so that a future monolith cannot ship again.
21. As CI, I want the omitted-UI comment gone, so that the docs match the check.
22. As CI, I want a Provider-only size budget, so that the win has a number that cannot silently grow.
23. As CI, I want the full-barrel size budget to keep measuring a bundled import, so that a tiny re-export file cannot fake a pass.
24. As a releaser, I want the version stamp still found in the published UI build, so that `prepublishOnly` does not fail closed or pass on the wrong file.
25. As a releaser, I want style verification to keep proving embedded CSS landed, so that an empty `__YV_STYLES__` cannot publish.
26. As a releaser, I want a patch changelog for the UI package, so that partners see a different artifact and a smaller unused-import graph.
27. As a maintainer adding a UI component later, I want the entry list to stay an explicit named list, so that a new file under components does not become a published entry.
28. As a maintainer, I want `noExternal` for core left alone, so that the UI package still ships the stamped core version.
29. As a maintainer, I want locale files to keep loading with the provider, so that this ticket does not become an i18n rewrite.
30. As a reviewer, I want `splitting` alone treated as a no-op, so that nobody closes the ticket after flipping one flag.
31. As a reviewer, I want a full UI build as the proof, so that a scratch tsup probe cannot hide a broken `verify:styles` or types step.
32. As a Storybook user, I want existing stories to keep running from source, so that the dist shape does not break local UI work.
33. As a unit-test author, I want Vitest still to import components from source, so that tests do not depend on the new chunk graph.
34. As the Vite example app, I want `pnpm build` to succeed after the split, so that a real app graph is exercised once.
35. As someone who only wanted the three components dropped, I want `YouVersionProvider` left inside the root build file, so that style markers do not have to move and the style guard can stay as it is unless a real build proves otherwise.

## Implementation Decisions

- The UI JavaScript build declares the package root plus every public component module as an entry (provider, reader, both pickers, auth button, verse of the day, verse, verse action popover, card, avatar, separator, textarea).
- Four entries are not enough. `src/index.ts` star-exports the components barrel, so the root file still imports the shared chunks that hold the reader and pickers. A Provider-only consumer then cannot drop them. Measured. All public modules must be entries so the root file is only re-exports.
- `splitting` is on. The flag is not sufficient by itself. The extra entries are what create chunks.
- `YouVersionProvider` is its own entry. Style markers leave `dist/index.js`. The style guard must read every JavaScript file under `dist`.
- Do not glob the components folder. A glob compiles tests, stories, internals, and the components barrel. Those files would publish because the UI package ships all of `dist`.
- Do not use the public-barrel module list as the entry list. That list is the wrong size for this ticket, omits the provider, and forces style-guard work the outcome does not need.
- Do not add package `exports` subpaths. The public import stays the package root. Relative chunk imports inside `dist` do not need export-map entries.
- Do not change `noExternal` for core. The UI package still inlines core so the published version stamp stays the one core baked in.
- Do not change `dts` or the TypeScript declaration build. Types stay a separate step.
- Do not change `sideEffects`. The CSS glob is already correct.
- The tree-shaking check gains a UI row. A Provider-only import must omit reader and picker sentinels. Control imports of each of those three must still contain their sentinels. A multi-export barrel must be larger than the Provider-only bundle.
- Sentinels are error strings or storage keys owned by one component. They are never UI copy, i18n keys, or `data-slot` values. Provider loads every locale, and the embedded stylesheet already contains Bible renderer slots.
- The UI check’s externals include React, `react/jsx-runtime`, `react-dom`, `jsdom`, and TanStack Query. Query is required because the provider graph goes through hooks.
- Do not gate success on a tiny root file. A four-entry build keeps provider, i18n, and the other public components in the root file. The real gates are “at least one chunk exists” and “the tree-shaking check passes.”
- Size-limit keeps a full-barrel row that bundles the import graph, not the raw root file. Add a Provider-only row with a named import, same idea as the core `ApiClient` and hooks `useChapter` rows. Set each limit from a measured build plus about 10% headroom.
- Rewrite `verify-styles` only if a real four-entry production build fails it. If a rewrite is required, scan every JavaScript file under `dist`, not only the top-level folder. Do not copy the version-stamp helper’s top-level-only read as a default.
- Leave the version-stamp helper alone unless a real publish-style UI build can no longer see the stamp. If that happens, scan nested JavaScript too. Do not guess the layout from a probe that skipped i18n and CSS.
- Hashed leftover chunks are in scope if they would publish. Start the UI build from an empty `dist` before CSS is written, and do not let the JavaScript build delete that CSS. A stale hashed file must not satisfy a style or stamp scan.
- CONTRIBUTING must say the tree-shaking check now covers UI, and that the win is the extra entries, not the `splitting` flag alone.
- Ship a patch changeset for the UI package. Partners get a different artifact and a smaller unused-import graph.
- Replacing `Object.assign` on the three namespace exports with a plain object is out of this ticket. It might help a one-file bundle shake, but this story requires a split `dist`.

## Testing Decisions

A good test here is a consumer-shaped import. It names the symbols a partner would name. It asserts those unused modules are absent, and that the modules you did import still contain their own sentinels. It does not assert file names, chunk counts beyond “at least one,” or i18n prose.

The highest existing seam is the root tree-shaking check. Add the UI package there. Do not invent a second harness. That script already aliases built `dist` through the `module` field, checks `sideEffects` separately, and has an integrity probe that fails if a sentinel is stale.

Use these seams, in this order:

1. Tree-shaking check, UI row. This is the acceptance seam for “Provider-only drops the three.”
2. Size-limit, Provider-only named import plus the existing full barrel. This locks the size of the win.
3. Existing style verification and version-stamp guards. Touch them only if the four-entry build fails them.
4. ESM and CJS public export counts, compared to today’s count, not hard-coded forever.
5. The Vite example production build. Every earlier step bundles `dist` with esbuild. Only this step resolves chunks the way a partner bundler does.

Prior art: the core and hooks rows in the tree-shaking check, the `ApiClient` / `useChapter` size-limit rows, the UI style verifier, the version-stamp publish guard, and the Vite example app.

After a clean forced turbo build:

- The UI `dist` contains at least one shared chunk.
- The UI `dist` contains no test or Storybook outputs.
- `pnpm check:tree-shaking` passes, including the new UI row.
- Style verification still passes.
- The UI version-stamp check still passes.
- ESM and CJS root exports match each other and do not lose symbols.
- `pnpm size` passes against the new measured limits.
- UI typecheck, unit tests, and lint pass.
- Dead-code analysis reports no new UI findings.
- UI Storybook integration tests still pass.
- The Vite example app still builds.

Do not treat a scratch tsup write that skipped i18n generation, CSS, style verification, or declarations as proof.

## Out of Scope

- Lazy-loading locale files
- Subpath exports such as `./bible-reader`
- Removing `noExternal` for core
- A general size reduction of the provider graph
- Changing `dts` or the TypeScript declaration pipeline
- Making `YouVersionProvider` its own entry so the root file becomes a re-export stub
- Compiling every public UI module as an entry
- Changing `'use client'` handling
- Rewriting `Object.assign` namespace exports to plain objects
- New public API

## Further Notes

`splitting: true` with one entry was measured byte-identical at 999,148 B. Sibling packages already emit chunks from a short named entry list and do not set the flag. The UI package is the outlier because it has one entry and sets `splitting: false`.

The three drop targets are namespace objects (`BibleReader.Root`, and the same shape on the pickers). They are not `forwardRef` components. The PR description should say that. The reason a one-file bundle keeps them is an unannotated top-level call, not a wrong `sideEffects` field.

`YouVersionProvider` does not import the reader or either picker. That is necessary. It is not sufficient. The root file must not import their chunks.

Do not run Task-style style-guard work “just in case.” Run the real UI build first. If the three style markers are still in the root file, leave the guard alone.
