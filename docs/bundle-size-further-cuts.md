# Further cuts after YPE-5528

Investigated 2026-09-02 on `cp/test-small-pkg-size` against this repo’s built `dist`, official Tailwind / Zod / i18next / tsup / esbuild / size-limit / Node / npm / webpack / Vite docs, and first-party Swift module layout. No code was changed for this note.

## Verdict

Largest honest partner-visible wins first.

**Zod 4.5 `z.compile()` does not shrink the bundle.** Official compile docs: invoking `z.compile()` or `import "zod/compile"` adds about **7 KB gzip** (28 KB minified). A four-key object schema goes from 24.1 KB to 31.1 KB gzip on classic Zod, and from 4.6 KB to 13.2 KB on Mini. This repo is on zod 4.1.12. Compile is a parse-speed feature. Do not adopt it for size.

1. **Change every core `import { z } from 'zod'` to `import * as z from 'zod'`.** Official Zod docs say esbuild cannot drop locale files under the named import this repo uses. The ApiClient, `useChapter`, and Provider input graphs each include **48 zod locale modules / 235,451 B** unminified. This is the cheapest cut that hits all three packages. Landed on this branch.
2. **Keep the version stamp, stop inlining all of core.** `noExternal: ['@youversion/platform-core']` puts a second Configuration+zod copy into UI. The minified Provider bundle contains `youversion-platform:granted-permissions` **twice**. Stamp lives in published core. Landed on this branch.
3. **Split embedded CSS.** Provider’s `YvStyles` string includes the full `dist/tailwind.css` (82,139 B). The `@layer yv-sdk-bible-reader` slice is **33,034 B / 3,162 B brotli**. The other 49,104 B is chrome plus utilities for every UI component. Tailwind v4 documents `source(none)` + `@source` for multiple stylesheets. Swift already ships Reader as its own module.
4. **Point the size-limit gate at first paint.** Official `@size-limit/esbuild` does not set `splitting`. Official esbuild then inlines `import()`. Same Provider graph: **117,852 B brotli** without splitting, **96,794 B** with it. The 117 kB row is not a Vite first-paint number.
5. **`zod/mini`.** Landed on this branch. Core schemas and clients now `import * as z from 'zod/mini'`. Do not touch `z.core` (it re-inflates the full barrel). Do not use Zod 4.5 `z.compile()`.
6. **Keep i18next off the Provider graph.** Landed on this branch. Provider records locale in `pending-locale.ts`. Missing-app-key strings are a generated 15-locale map. Translating components still import `i18n/index.ts`. Official i18next has no compile-time subset. Do not put `localeLoaders` or `import()` catalogs on the Provider module.
7. **Exclude UI `dist/test` from the tarball** the way hooks already does. That is npm disk, not partner JS.
8. **Hooks extra tsup entries are low leverage until zod moves.** `useChapter` is 57.44 kB brotli vs a 61.01 kB barrel.

Provider-only leftovers after the landed cuts. Re-checked 2026-09-02.

| Leftover | On Provider-only? | Evidence |
| --- | --- | --- |
| Auth `import()` inlined by size-limit | Yes | Official `@size-limit/esbuild` does not set `splitting`. Do not move Auth off Provider. |
| zod Mini via Configuration storage/grants | Yes | `includeAuth` still parses stored grants. Do not touch `z.core`. Do not use Zod 4.5 compile. |
| i18next + catalogs | No | Off Provider. Still on scripture, pickers, auth, and the full barrel. Official i18next has no compile-time subset. |
| Full utility sheet + reader CSS | No | Provider embeds chrome only. Scripture, pickers, and chrome-adjacent roots inject the full sheet. |
| Second copy of core | No | Stamp lives in published core. UI does not inline the rest of core. |
| Story/test-only Tailwind classes | No | `@source not` on stories/tests is landed. `tailwind.css` **7.74 → 7.66 kB**. |
| radix, xstate, tailwind-merge | No | Absent from the minified Provider output. They stay on the components that use them. |
| TanStack Query | Peer/ignore | size-limit `ignore` lists it; a partner who does not already have it still pays |

Blocked floors: CJS+ESM (public `require`), CHANGELOG, tsup syntax/identifier minify and core `treeshake` (stamp ADR). `useChapter` no longer ships `BibleClient`; host `bibleClient` overrides still win.

## Already landed

Measured on this branch after `pnpm --filter @youversion/platform-core --filter @youversion/platform-react-hooks --filter @youversion/platform-react-ui build`.

| Item | What it did | Source |
| --- | --- | --- |
| UI tsup 13 named entries + `splitting: true` | Provider entry is a 201 B re-export. Reader / picker sentinels are absent from a Provider-only bundle | `packages/ui/tsup.config.ts` lines 6–22; `scripts/check-tree-shaking.mjs` UI row |
| English eager, 14 locales `import()` | ESM locale files 6.4–16.3 kB each under `packages/ui/dist/{af,ar,…}-*.js` | `packages/ui/src/i18n/resources.generated.ts` lines 13–28; `packages/ui/dist/chunk-JYNC4O7D.js` lines 150–165 |
| Provider-only size-limit row | After language extracts + story/test `@source`: Provider **16.07 kB** / 18; ApiClient **6.45 kB** / 8; useChapter **9 kB** / 10; full barrel **158.42 kB** / 175; chrome.css **1.31 kB** / 2; tailwind.css **7.66 kB** / 9; core full **19.38 kB** / 21; hooks full **23.12 kB** / 26 | `.size-limit.js`; `pnpm size` |
| Chrome CSS `@source` split | Provider embeds `dist/chrome.css` (10,178 B / 2.43 kB brotli): missing-app-key utilities only. ProfileAvatar, Separator, Textarea, and scripture roots inject full `dist/tailwind.css` as `yv-sdk-components`. Public `./styles.css` stays the full sheet. | `packages/ui/src/styles/chrome.css`; `packages/ui/src/lib/yv-styles.tsx` |
| Tarball hygiene | Locale `import()` types are a catalog map (resources.generated.d.ts 93 kB → 514 B). Published `files` drop `*.d.ts.map`, stale `*.d.cts`, UI `chrome.css`, and UI `bible-reader.css`. Core/hooks `build` wipes `dist` first. | package `files`; core/hooks `build` scripts |
| size-limit honesty | Gate lives in `.size-limit.js`. esbuild `splitting` stays off so locale `import()`s stay inlined. | `.size-limit.js`; `CONTRIBUTING.md` |
| tsup whitespace minify | Published JS drops whitespace only. Syntax/identifier minify stay off so `isPublishBuild = true\|false` still matches the stamp guard. Pack: core 104→86 kB, hooks 46→38 kB, UI 294→272 kB. Partner size-limit unchanged. | package `tsup.config.ts` files |
| Stamp version via `define` | tsup/`vitest` inline `package.json` `version` only. Published JS no longer embeds the rest of the manifest. | `packages/core/src/version.ts`; `packages/core/tsup.config.ts` |
| Chrome token slim | Provider embeds scoped preflight + missing-app-key tokens, not the full brand palette. Public `theme.css` keeps the tokens SDK components read. | `packages/core/src/styles/preflight.css`; `packages/ui/src/styles/chrome.css` |
| Core named client entries | tsup emits ApiClient, BibleClient, Users, and Configuration as separate files. Provider and ApiClient-only drop unused clients. | `packages/core/tsup.config.ts` |
| Hooks context leaf imports | Data hooks import `YouVersionContext` from its module. Auth `import()` stays inside a function so `useChapter` does not evaluate it. | `packages/hooks/src/useBibleClient.ts`; `packages/hooks/src/context/YouVersionProvider.tsx` |
| `@radix-ui/react-avatar` | ProfileAvatar no longer depends on the `radix-ui` umbrella. Partner install drops that package. Full-barrel size-limit moved 162.55 → 162.49 kB. | `packages/ui/src/components/ui/avatar.tsx`; `packages/ui/package.json` |
| tsup `treeshake` on hooks and UI | Extra Rollup pass. Do not enable it on core: it inlines `SDK_VERSION` and deletes `isPublishBuild`. | hooks/UI `tsup.config.ts`; `scripts/check-sdk-version-stamp.mjs` |
| Split style injectors | `YvStyles`, `YvComponentStyles`, and `YvReaderStyles` are separate modules. The published Provider entry no longer imports the combined 87 kB sheet chunk. | `packages/ui/src/lib/yv-styles-*.tsx` |
| Slim generated catalogs | `generate:i18n` writes used-key JSON under `src/i18n/slim/` (gitignored). Crowdin files under `locales/` stay complete. Full barrel 162.21 → **159.76 kB**. | `packages/ui/scripts/generate-i18n-resources.mjs` |
| Publish-minified core CSS | `src/styles/*.css` stays readable. `build:css` writes minified copies to `dist/styles/`. Specifier stays `@youversion/platform-core/browser/styles/*`. Core packed **85.3 → 80.8 kB**. `bible-reader.css` 31,831 → 13,224. | `packages/core/scripts/minify-browser-css.mjs` |
| Unused Button/Badge variants | Dropped `destructive` / `link` on Button and unused Badge variants. Full barrel 159.76 → **159.62 kB**. `tailwind.css` 8.74 → **8.63 kB**. | `packages/ui/src/components/ui/button.tsx`; `badge.tsx` |
| Version-filter state module | Configuration statics delegate to `version-filter-state.ts`. `useChapter` reads `getVersionFilterSnapshot` instead of the Configuration class. useChapter **15.18 → 13.73 kB**. Grants key is absent from the useChapter tree-shake fixture. | `packages/core/src/version-filter-state.ts`; `packages/hooks/src/internal/versionFilterKey.ts` |
| Standalone `getChapter` | `useChapter` calls `getChapter` unless a host `bibleClient` override is set. Named tsup entry keeps `getChapter` off the `BibleClient` chunk. useChapter **13.73 → 8.91 kB**. `page_size="*"` and jsdom sentinels are absent from the useChapter tree-shake fixture. | `packages/core/src/bible-chapter.ts`; `packages/hooks/src/useChapter.ts` |
| Standalone bible reads | `getBooks` / `getBook` / `getChapters` / `getVerses` / `getVerse` / `getVOTD` / `getAllVOTDs` live in `bible-reads.ts`. Matching hooks skip `BibleClient` unless a host override is set. useChapter stayed **8.91 kB**. | `packages/core/src/bible-reads.ts` |
| Standalone `getVersions` | `useVersions` calls `getVersions` unless a host override is set. Version-picker tree-shake fixture **791 → 776 KB** raw (jsdom stays on `getPassage`). | `packages/core/src/bible-versions.ts`; `packages/hooks/src/useVersions.ts` |
| Standalone `getPassage` | `usePassage` calls `getPassage` unless a host override is set. jsdom stays on the HTML-transform path. BibleReader tree-shake fixture **1143 → 1139 KB** raw. useChapter stayed **9 kB**. | `packages/core/src/bible-passage.ts`; `packages/hooks/src/usePassage.ts` |
| Standalone `getLanguage` / `getLanguages` | Matching hooks skip `LanguagesClient` unless a host override is set. Named tsup entries keep the class off the standalone chunks. hooks full **23.21 → 23.12 kB**. BibleVersionPicker **776.2 → 774.6 KB** raw. | `packages/core/src/languages-language.ts`; `packages/core/src/languages-list.ts` |
| Story/test `@source not` | Full-sheet Tailwind no longer scans `*.stories.*` / `*.test.*`. `tailwind.css` **7.74 → 7.66 kB**. Full barrel **158.73 → 158.42 kB**. | `packages/ui/src/styles/global.css` |
| Unused Item / InputGroup CSS | Dropped unused Item `outline`/`muted`/`image` variants and unused InputGroup aligns. Dropped unused `chart-*` / `sidebar-*` `@theme` keys. Full barrel 159.77 → **159.17 kB**. `tailwind.css` 8.63 → **8.44 kB**. | `packages/ui/src/components/ui/item.tsx`; `input-group.tsx`; `packages/ui/src/styles/global.css` |
| Unused public theme tokens | Dropped unused Figma steps (`orange`/`teal`/`green`/`purple`/`magenta`, unused yellows/blues, `gray-25`) and unused `chart`/`sidebar` aliases. Kept tokens components read (`yellow-10`, `blue-30`, grays, semantic colors). `theme.css` dist 4862 → **2181**. Full barrel 159.17 → **158.58 kB**. `tailwind.css` 8.44 → **7.74 kB**. | `packages/core/src/styles/theme.css` |
| `noExternal` core | Version-stamp contract. UI inlines core’s dist | `packages/ui/tsup.config.ts` lines 32–38; `scripts/check-sdk-version-stamp.mjs` |
| size-limit ignore | UI rows ignore react, jsx-runtime, react-query | `.size-limit.json` lines 41–54 |

`scripts/measure-import-size.mjs` (no splitting): Provider **882,927 / 194,155 / 117,852** (raw / gzip-9 / brotli). Full barrel **1,233,065 / 312,215 / 210,758**. `tailwind.css` **82,139 / 12,443 / 10,731**.

## Remaining cuts

### 1. Zod locale import style

| | |
| --- | --- |
| **What** | Replace `import { z } from 'zod'` with `import * as z from 'zod'` in every core runtime file that imports zod. Same call sites, official esbuild workaround. |
| **Where** | `@youversion/platform-core` (every `src/schemas/*.ts`, `client.ts`, `bible.ts`, `highlights.ts`, `languages.ts`, `organizations.ts`, `version-filters.ts`). Hooks and UI pick it up transitively. |
| **Leverage** | Input graph for `ApiClient`, `useChapter`, and Provider-visualize each lists **71 zod files / 478,856 B**, of which **48 locale files / 235,451 B**. Core `ApiClient` size-limit is already 52.67 kB brotli; hooks `useChapter` is 57.44 kB. I did not re-bundle after the import change, so the brotli delta is not measured. Official Zod says this is the esbuild-specific leak. |
| **Risk** | Low. Public API unchanged. Call sites stay `z.object`, `z.string`. Must change every file; a leftover named import still pulls locales. |
| **Source** | [Zod error customization](https://zod.dev/error-customization): “esbuild can't (evanw/esbuild#1420) — with `import { z } from "zod"` or `import z from "zod"` it bundles every locale, so prefer `import * as z from "zod"`.” This repo: `packages/core/src/client.ts` line 1 and the same named import in every schema file. Visualize inputs: `bundle-report/core-apiclient.json`, `hooks-usechapter.json`. |

Provider-only cannot drop zod entirely. `YouVersionPlatformConfiguration.storedUserInfo` and `readStoredGrants` call `safeParse` (`packages/core/src/YouVersionPlatformConfiguration.ts` lines 139 and 244). Hooks Provider imports that class (`packages/hooks/src/context/YouVersionProvider.tsx` lines 10–13).

### 2. Stamp-only `noExternal`

| | |
| --- | --- |
| **What** | Inline only the `X-YVP-Sdk` module (today `packages/core/src/version.ts`). Leave the rest of core as a normal dependency so UI and hooks share one copy. |
| **Where** | `packages/ui/tsup.config.ts` `noExternal`. `scripts/check-sdk-version-stamp.mjs` must still see `SDK_VERSION` + `isPublishBuild = true` in a published UI file. |
| **Leverage** | Minified Provider bundle: `youversion-platform:granted-permissions` ×2 and the missing-app-key sentence ×2. That is two Configuration copies, not a guess. UI size-limit already includes inlined core ([CONTRIBUTING.md](../CONTRIBUTING.md) “Non-additive UI numbers”). Deduping should drop one zod+Configuration copy from the partner graph. Exact brotli not measured without the change. |
| **Risk** | Medium. This is the replacement the stamp contract needs. UI Provider today writes filters onto *its* inlined Configuration because hooks has a different copy (`packages/ui/src/components/YouVersionProvider.tsx` lines 50–53; `packages/hooks/src/context/YouVersionProvider.tsx` lines 21–25). Externalizing core *fixes* that dual-instance bug if both packages resolve the same core. Do not drop `noExternal` with no stamp target. Do not add a public subpath unless the stamp file cannot stay an internal chunk. |
| **Source** | `packages/ui/tsup.config.ts` lines 32–38; `packages/core/src/version.ts` lines 4–20; `scripts/check-sdk-version-stamp.mjs` lines 1–8, 55–56. Official tsup: `noExternal` re-includes a package that would otherwise stay external ([tsup docs](https://tsup.egoist.dev/) “Excluding packages” / “Excluding all packages”). |

### 3. CSS split (reader sheet + per-entry `@source`)

| | |
| --- | --- |
| **What** | Two Tailwind inputs. Provider embeds chrome (theme, preflight, utilities needed by Provider / missing-app-key / fonts). `BibleReader` loads `@layer yv-sdk-bible-reader` (core `bible-reader.css` plus the `.yv-v-selected` rules in `global.css`). Optional second step: `source(none)` + `@source` so the chrome sheet does not scan reader/picker class names. |
| **Where** | `packages/ui/src/styles/global.css` lines 33–45 (one `@import` of `bible-reader.css` into the only CSS entry). `packages/ui/src/lib/yv-styles.tsx` embeds `__YV_STYLES__`. `packages/ui/tsup.config.ts` `define` reads `dist/tailwind.css`. |
| **Leverage** | From `packages/ui/dist/tailwind.css`: bible-reader layer **33,034 B / 3,548 gzip / 3,162 brotli**; chrome remainder **49,104 / 9,112 / 7,891**; whole file **82,139 / 12,443 / 10,731**. That CSS is a JS string in `chunk-4LHYPLMH.js` (85.77 kB, almost all stylesheet). Unused-utility savings from a second `@source` set are **not measured**. 3 kB brotli is the honest floor. |
| **Risk** | Medium. `verify-styles` and the tree-shaking “style markers still present” check assume Provider still injects a real sheet (`scripts/check-tree-shaking.mjs` lines 178–181). Children rendered under Provider without `BibleReader` would lose USFM typography until the reader sheet loads. Swift already separates that: `YouVersionPlatformReader` depends on `YouVersionPlatformUI` and owns reader sources (`YouVersionPlatformReader.podspec` lines 1–15). |
| **Source** | [Tailwind v4 detecting classes](https://tailwindcss.com/docs/detecting-classes-in-source-files) “Disabling automatic detection”: `source(none)` plus `@source` “in projects that have multiple Tailwind stylesheets where you want to make sure each one only includes the classes each stylesheet needs.” Core files: `packages/core/src/styles/theme.css` (8,350 B), `bible-reader.css` (31,831 B, 1,366 lines), `index.css` lines 1–3. |

### 4. size-limit first-paint (measurement, then budget)

| | |
| --- | --- |
| **What** | Move `.size-limit.json` to `.size-limit.js` and set `splitting: true` (plus `outdir`) via official `modifyEsbuildConfig`. Keep a second no-split row if you still want the “esbuild partner who inlines `import()`” number. |
| **Where** | Root size-limit config. `scripts/measure-import-size.mjs` already documents the inline (lines 108–109) and does not set `splitting` (lines 79–90). |
| **Leverage** | Same Provider import, same externals: no-split **117,852 B brotli**; `splitting: true` first-paint chunks **96,794 B brotli**; the 14 locale chunks **19,708 B brotli** off the critical path. size-limit this run: **117.2 kB**. |
| **Risk** | Low for the gate change. Budgets must be retuned or CI goes green for the wrong reason. Official `modifyEsbuildConfig` is documented for `.size-limit.js` only, not JSON ([size-limit README](https://github.com/ai/size-limit/blob/master/README.md) config options). |
| **Source** | [`@size-limit/esbuild` `get-config.js`](https://raw.githubusercontent.com/ai/size-limit/master/packages/esbuild/get-config.js): `bundle`, `minify*`, `treeShaking`, **no `splitting`**. [esbuild `#splitting`](https://esbuild.github.io/api/#splitting): “Without code splitting enabled, an `import()` expression becomes `Promise.resolve().then(() => require())` instead… the imported code is included in the same bundle.” [Vite dynamic import](https://vite.dev/guide/features.html#glob-import) splits `import()` onto their own chunks. |

`pnpm size:visualize` / `scripts/bundle-visualize.mjs` also omits `splitting` and uses `write: false`, so `bytesInOutput` in `bundle-report/*.json` is 0. Use `inputs[].bytes` or re-run with `write: true`. The UI visualize targets also omit `react/jsx-runtime` and `@tanstack/react-query`, so that report is not the size-limit graph.

### 5. `zod/mini` (landed)

| | |
| --- | --- |
| **What** | `import * as z from 'zod/mini'` and rewrite method chains to `z.string().check(...)` / `z.optional(z.string())`. |
| **Where** | Same core schema files as cut 1. |
| **Leverage** | After this branch: core full 25.3 → 20.02 kB brotli; ApiClient 21.0 → 15.73; hooks full 29.8 → 23.59; useChapter 26.2 → 20.12; Provider 75.3 → 69.18; UI full 168.4 → 162.37. Do not reference `z.core` (full barrels jumped to 53 kB until that access was removed). |
| **Risk** | Parse success is unchanged. Custom issue strings used by client tests are passed into Mini checks. Default Mini issue text is `"Invalid input"` unless a check supplies its own error. |
| **Source** | [zod.dev/packages/mini](https://zod.dev/packages/mini) “Tree-shaking” and “No default locale.” [zod.dev/v4](https://zod.dev/v4) “Introducing Zod Mini.” |

### 6. i18next runtime (off Provider; still on scripture)

| | |
| --- | --- |
| **What** | Provider calls `requestSdkLanguage` instead of importing `i18n/index.ts`. Missing-app-key copy lives in `provider-strings.generated.ts`. Scripture, auth, and pickers still import i18next. |
| **Where** | `packages/ui/src/i18n/pending-locale.ts`, `packages/ui/src/components/YouVersionProvider.tsx`, `packages/ui/src/components/missing-app-key.tsx`. |
| **Leverage** | Provider-only size-limit 69.18 → **30.5 kB** brotli. Full barrel stays ~163 kB because those entries still load i18next and catalogs. Official i18next has no compile-time subset. |
| **Risk** | A host that never imports a translating SDK component will not load locale JSON. Missing-app-key still translates from the generated map. Children that import `@/i18n` pick up the pending locale. |
| **Source** | [i18next configuration](https://www.i18next.com/overview/configuration-options) `partialBundledLanguages` (already `true` at `packages/ui/src/i18n/index.ts` line 99). [Add or load translations](https://www.i18next.com/how-to/add-or-load-translations) “Combined with a backend plugin” and “Lazy load in memory translations.” First-party [i18next#1418](https://github.com/i18next/i18next/issues/1418): “i18next is fundamentally a runtime library… compile-time, near-zero-runtime locale bundles is something we haven't tackled.” |

Sister Swift: UI strings live in `Localizable.xcstrings` synced from platform-localization (`platform-sdk-swift/docs/localization-guardrails.md`). That is catalog policy, not a JS tree-shake strategy. Kotlin repo was not on disk.

### 7. `files` / `sideEffects` / `exports` hygiene

| | |
| --- | --- |
| **What** | Add hooks-style `"!dist/test"` (and maps) to UI `files`. Keep `sideEffects: ["**/*.css"]`. Do not add public subpath exports. |
| **Where** | `packages/ui/package.json` lines 24–32. Compare `packages/hooks/package.json` lines 8–15. |
| **Leverage** | UI `dist` this build: **261 files**, **80 `.d.ts`**, **18 files under `dist/test`**. `tsconfig.build.json` `include` is `"src"` and only excludes `*.test.*` / `*.stories.*`, so `src/test/*.ts` emits declarations. Partner JS does not import those. Tarball / IDE noise only. |
| **Risk** | Low if you only exclude test types. Changing `sideEffects` to `false` would lie: `i18n.init()` runs at module load (`packages/ui/src/i18n/index.ts` lines 91–109). Webpack uses `sideEffects` to skip unused modules ([webpack tree shaking](https://webpack.js.org/guides/tree-shaking/)). The CSS glob is already the documented pattern for stylesheets. |
| **Source** | [npm `files`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files): inclusion list, gitignore-style. [Node `exports`](https://nodejs.org/api/packages.html#exports): when `exports` is set, unpublished subpaths stay encapsulated. Relative chunk imports inside `dist` do not need export-map entries (YPE-5528 decision). Conditional `browser` vs `node` is already used on core for jsdom (`packages/core/package.json` lines 30–32, 33–49). |

### 8. tsup / CJS / minify (mostly not partner JS)

| | |
| --- | --- |
| **CJS locale split** | Official tsup: code splitting “currently only works with the `esm` output format”; `--splitting` is the experimental CJS opt-in ([tsup Code Splitting](https://tsup.egoist.dev/)). This build set `splitting: true` and **did** emit CJS locale files (`dist/af-*.cjs`, …). The CJS Provider entry `require()`s four chunks, not those locale files (`dist/components/YouVersionProvider.cjs`). A CJS bundler that understands `import()` gets the same lazy locales. A bundler that inlines `import()` does not. |
| **`treeshake: true` (Rollup)** | Measured. Keep on hooks and UI. Do not enable on core: Rollup folds `isPublishBuild = true\|false` the same way `minifySyntax` does, and the stamp guard then fails closed. |
| **`minify` on tsup** | Official tsup `--minify`. Partners minify again. Helps the npm tarball and parse-from-node_modules, not the size-limit number. |
| **`experimentalDts`** | Types are `tsc` on purpose (repo ADR / AGENTS.md). Irrelevant to JS bytes. |

### Out of scope here (named so they are not mistaken for leftovers)

- New public subpath API. Tailwind multiple stylesheets and the stamp module can stay internal chunks.
- Dropping `noExternal` with no stamp replacement.
- Globbing `src/components/*`.
- Replacing i18next or zod with a different library.
- Architecture rewrite of the SDK.

## Measurement notes

What each ruler counts:

| Ruler | Bundler | `splitting` | Externals | What 117 kB means |
| --- | --- | --- | --- | --- |
| `pnpm size` / size-limit UI Provider | esbuild (`@size-limit/esbuild` `get-config.js`) | **off** | react, react-dom, jsx-runtime, react-query | Minified+brotli of Provider **plus inlined locale `import()`s** |
| `pnpm size:measure` | esbuild 0.25.9 | **off** (script lines 79–90) | same + jsdom | 117,852 B brotli this run |
| This note’s Vite-like probe | esbuild, `splitting: true` | **on** | same | First-paint **96,794 B** brotli; locales **19,708 B** brotli in other files |
| Vite / webpack partner | Rollup or webpack | on for `import()` | host app | Should resemble the 97 kB probe, not 117 kB. Not re-measured in Vite itself |
| `pnpm size:visualize` | esbuild, `write: false` | off | UI targets omit jsx-runtime and react-query | Unminified input graph. `bytesInOutput` is 0. Use `inputs[].bytes` |

Hooks `useChapter` (57.44 kB) vs full barrel (61.01 kB) shows the remaining hooks floor is zod via `useApiClient` → `ApiClient` (`packages/hooks/src/internal/useApiClient.ts` lines 4, 32), not unused hook modules.

UI `dist/index.js` re-exports the whole core barrel from `chunk-JYNC4O7D.js` (555.07 kB, i18n + inlined core). A Provider-only import still *reads* that chunk for `YouVersionPlatformConfiguration` and i18n (`dist/components/YouVersionProvider.js` lines 1–9; `dist/chunk-4LHYPLMH.js` lines 4–8). Tree-shaking dropped `HighlightsClient`’s hex-color sentinel from the Provider minify output (`Color must be a 6-character hex` count 0). It did not drop zod or the CSS string.

## Sources

Repo (this branch, built locally):

- `.size-limit.json`
- `packages/ui/tsup.config.ts`, `package.json`, `src/styles/global.css`, `src/lib/yv-styles.tsx`, `src/i18n/index.ts`, `src/i18n/resources.generated.ts`, `src/components/YouVersionProvider.tsx`, `src/types.ts`, `src/index.ts`, `tsconfig.build.json`
- `packages/core/tsup.config.ts`, `package.json`, `src/index.ts`, `src/client.ts`, `src/version.ts`, `src/YouVersionPlatformConfiguration.ts`, `src/styles/{index,theme,bible-reader}.css`
- `packages/hooks/package.json`, `src/index.ts`, `src/context/YouVersionProvider.tsx`, `src/internal/useApiClient.ts`
- `scripts/measure-import-size.mjs`, `scripts/bundle-visualize.mjs`, `scripts/check-tree-shaking.mjs`, `scripts/check-sdk-version-stamp.mjs`
- `docs/ui-import-size-research.md`, `docs/bundle-size-hillclimb.md`, `docs/YPE-5528-ui-split-dist.md`, `CONTRIBUTING.md`
- `bundle-report/{core-apiclient,hooks-usechapter,ui-youversionprovider}.json` from `pnpm size:visualize`
- `platform-sdk-swift/YouVersionPlatformReader.podspec`, `platform-sdk-swift/docs/localization-guardrails.md`

Official:

- https://tailwindcss.com/docs/detecting-classes-in-source-files (multiple stylesheets, `source(none)`, `@source`)
- https://zod.dev/packages/mini
- https://zod.dev/v4 (Zod Mini)
- https://zod.dev/compile (`z.compile()` adds ~7 KB gzip)
- https://zod.dev/error-customization (locale tree-shaking / `import * as z`)
- https://www.i18next.com/overview/configuration-options (`partialBundledLanguages`)
- https://www.i18next.com/how-to/add-or-load-translations
- https://github.com/i18next/i18next/issues/1418 (first-party: runtime, not compile-time bundles)
- https://tsup.egoist.dev/ (splitting ESM vs experimental CJS, `noExternal`, minify, treeshake)
- https://esbuild.github.io/api/#splitting
- https://raw.githubusercontent.com/ai/size-limit/master/packages/esbuild/get-config.js
- https://github.com/ai/size-limit/blob/master/README.md (`import`, `ignore`, `modifyEsbuildConfig`)
- https://nodejs.org/api/packages.html#exports
- https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files
- https://webpack.js.org/guides/tree-shaking/ (`sideEffects`)
- https://vite.dev/guide/features.html#glob-import (dynamic `import()` chunks)
