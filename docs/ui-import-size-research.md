# UI Import Size Research: "Is the UI library 1 MB or more to import?"

Investigated 2026-09-02 against primary sources (local build at `main` @ `5ddc2e0`, npm registry, unpkg, jsDelivr). Question raised by Cameron Llewellyn in chat; answer: **yes, confirmed three independent ways, and the full consumer cost is higher than 1 MB.**

## Verdict

| Question | Answer | Real bytes |
| --- | --- | --- |
| Is the file a bundler reads 1 MB+? | Yes | `dist/index.js` = 1,006,112 B on npm (unpkg + jsDelivr agree); fresh local build = 1,005,770 B |
| What lands in a consumer's minified bundle for ONE component? | Yes, more | 1,148,234 B raw / 281,274 B gzip -9 / 196,121 B brotli |
| Same, for the full barrel import? | Yes | 1,190,349 B raw / 294,584 B gzip / 203,553 B brotli |
| What npm installs on disk? | Yes | 2,332,668 B unpacked, 166 files, 448,505 B tarball |

The gap between "one component" and "everything" is only 42,115 B raw. That single number is the tree-shaking failure YPE-5528 exists to fix.

Over the wire, a narrow consumer pays ~281 KB gzip / ~196 KB brotli, not 1 MB. The 1 MB figure is real parse bytes, not network cost.

## Measurement 1: fresh local build (repo at `main` @ `5ddc2e0`)

Rebuilt `packages/ui` from clean inputs (`build:css` then `build:js`), then bundled consumer fixtures with the repo's own esbuild (0.25.9), settings mirroring `scripts/check-tree-shaking.mjs` plus `--minify`:

```
esbuild <fixture> --bundle --minify --format=esm --platform=browser
  --alias:@youversion/platform-react-ui=<abs>/packages/ui/dist/index.js
  --external:react --external:react-dom --external:react/jsx-runtime
  --external:@tanstack/react-query --external:jsdom
```

Compression via node `zlib` (gzip level 9, brotli default quality 11).

| Artifact | raw | gzip -9 | brotli |
| --- | --- | --- | --- |
| `dist/index.js` (as shipped, unminified) | 1,005,770 B | 191,060 B | 154,930 B |
| `dist/index.cjs` | 1,025,882 B | - | - |
| `dist/tailwind.css` | 82,139 B | - | - |
| Consumer: `YouVersionProvider` only | 1,148,234 B | 281,274 B | 196,121 B |
| Consumer: `import *` full barrel | 1,190,349 B | 294,584 B | 203,553 B |

Cross-check: current `.size-limit.json` budget "ui / full barrel" is 235 KB and CI passes; my full-barrel brotli measures 203,553 B (~199 KB), consistent with that budget being brotli-based.

## Measurement 2: what the bundle is made of (esbuild metafile)

Narrow bundle: 221 input files, 2,687,610 B unminified input. Top inputs:

| Input | Unminified bytes | Comes from |
| --- | --- | --- |
| `packages/ui/dist/index.js` | 1,005,770 | the package itself (core already inlined via `noExternal`) |
| `packages/core/dist/index.js` | 98,897 | pulled a second time through `@youversion/platform-react-hooks` (partly tree-shaken; core sentinels appear once in output) |
| `tailwind-merge` | 93,397 | UI runtime dep |
| `xstate` | 87,639 | UI runtime dep |
| `i18next` | 80,712 | UI runtime dep (loads all 15 locales eagerly via `YouVersionProvider.tsx:4`) |
| `zod` (multiple files) | ~300,000 total | transitive via core |
| `@radix-ui/react-select` | 49,584 | UI runtime dep |

Hooks package alone (`useYVAuth` only): 316,802 B raw / 66,851 B gzip / 56,810 B brotli, dominated by zod via core. The UI dist still imports Radix, xstate, i18next, clsx, cva, better-result, and hooks at runtime; only core is inlined.

## Measurement 3: the published package on npm (source: registry + CDNs)

| Metric | Value | Source |
| --- | --- | --- |
| Latest version | 2.12.0 | `https://registry.npmjs.org/@youversion/platform-react-ui` (dist-tags) |
| Tarball `.tgz` | 448,505 B | downloaded byte count from `https://registry.npmjs.org/@youversion/platform-react-ui/-/platform-react-ui-2.12.0.tgz` |
| Unpacked size | 2,332,668 B (166 files) | registry metadata, same URL |
| `dist/index.js` published | 1,006,112 B | `https://unpkg.com/@youversion/platform-react-ui@latest/dist/index.js` (downloaded bytes) and `https://data.jsdelivr.com/v1/packages/npm/@youversion/platform-react-ui@2.12.0` (size field); exact match on both |
| `dist/index.cjs` published | 1,026,224 B | jsDelivr data API |
| Entry points | `"module": "./dist/index.js"`, `exports["."].import` same | `https://unpkg.com/@youversion/platform-react-ui@latest/package.json` |

Published 1,006,112 B vs local fresh build 1,005,770 B: 342 B apart, same generation of code.

## Interpretation

1. "1 MB to import" is correct and slightly understated. A consumer importing one component ships ~1.15 MB minified raw today because nothing in the single-file dist can be dropped.
2. Network cost is ~281 KB gzip / ~196 KB brotli for that narrow consumer. Both numbers are true; they answer different questions.
3. Even after YPE-5528 lands (splitting + per-component entries), the floor stays high: the plan's own measurements put the narrow bundle around 1.46 MB unminified, because i18next + 15 eager locales + inlined core + zod remain. Lazy locale loading is the next-biggest lever and is deliberately deferred (follow-up ticket).
4. Zod arrives through core and is the hidden heavyweight in any hooks-only consumer.

## Reproduction

From repo root (commands run with node 26.5.0, esbuild 0.25.9 from `packages/ui/node_modules/.bin/esbuild`):

```bash
cd packages/ui
./node_modules/.bin/tailwindcss -i src/styles/global.css -o dist/tailwind.css --minify
node node_modules/tsup/dist/cli-default.js

cd /tmp
printf "import { YouVersionProvider } from '@youversion/platform-react-ui';\nexport { YouVersionProvider };\n" > narrow.mjs
esbuild narrow.mjs --bundle --minify --format=esm --platform=browser \
  --alias:@youversion/platform-react-ui=<repo>/packages/ui/dist/index.js \
  --external:react --external:react-dom --external:react/jsx-runtime \
  --external:@tanstack/react-query --external:jsdom --outfile=narrow.bundle.js
node -e "const{readFileSync}=require('fs');const{gzipSync,brotliCompressSync}=require('zlib');const b=readFileSync('narrow.bundle.js');console.log(b.length,gzipSync(b,{level:9}).length,brotliCompressSync(b).length)"
```
