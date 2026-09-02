# Bundle size hillclimb

A playbook for shrinking what a partner ships. Not a rewrite of the packages.

Ticket already on the path. YPE-5528 (split UI dist). Parent YPE-1193.

## Who this is for

A partner who imports `@youversion/platform-react-ui`. Today one `YouVersionProvider` import parses about 1.0 MB and ships about 196 KB brotli. A full barrel is only 42 KB raw more. Almost nothing drops.

The next engineer inherits size-limit rows that lock each kept win, plus a rerunnable measure script.

## Metric

Primary. `ui / YouVersionProvider only`, minified + brotli, same externals as the research (`react`, `react-dom`, `react/jsx-runtime`, `@tanstack/react-query`, `jsdom`).

Secondary. `ui / full barrel` (235 KB budget today, measured ~204 KB brotli). `ui / tailwind.css`. Hooks and core rows only when they show up in the remaining Provider graph.

Do not use the tree-shaking fixture’s raw 1.46 MB as the ruler. That number is unminified and inlines deps. It answers “did sentinels drop,” not “what the partner downloads.”

## Done when

This predicate is true, checked on the real size-limit output and the measure script, not on a summary.

1. A frozen harness exists. One command prints the primary and secondary rows. Baseline is captured from `main` before any size-cut commit.
2. YPE-5528 has landed. Provider-only drops `BibleReader`, `BibleChapterPicker`, and `BibleVersionPicker`. `pnpm check:tree-shaking` has a UI row that passes.
3. A new Provider-only size-limit row exists. Its limit is the post-5528 measurement plus about 10% headroom.
4. The hillclimb then runs until one of these is true.
   - The next untried, in-scope hypothesis is under 5 KB brotli.
   - Six kept-or-reverted iterations in a row produce no keep.
   - The remaining ideas are named follow-ups (lazy locales, `noExternal`, zod policy).

“As small as possible” for every package at once is out. Core is a 64 KB budget. Hooks is 68 KB. UI is the partner-visible problem.

## Out of this run

- Lazy locale loading (follow-up ticket, do not sneak it into 5528)
- Removing `noExternal` for core (version-stamp contract)
- Subpath `exports`
- Compiling the components folder as a glob
- A general architecture rewrite

## Units (land in this order)

Each unit ends in a check. Do not start the next until the current one is green. One keep, one commit. Revert the whole change if the metric does not move past noise or the gate goes red.

### 1. Freeze the ruler

Add `ui / YouVersionProvider only` to size-limit on today’s monolith. Write a small measure script that matches `docs/ui-import-size-research.md` (minify + gzip-9 + brotli). Run it once. Store the numbers in `.audit/bundle-size.tsv`. No production behavior change.

Gate. `pnpm size` still passes. The new row has a limit taken from this baseline plus 10%.

### 2. Subtract unused Bible UI (YPE-5528)

Implement `docs/YPE-5528-ui-split-dist.md`. Public-module named entries. Not four. Not a glob. `YouVersionProvider` is an entry. `verify-styles` scans every JavaScript file under `dist`.

Gate. Tree-shaking UI row passes. Vite example builds. ESM and CJS export counts hold. Style and version-stamp guards pass. Re-run the measure script. The Provider-only brotli number must fall. Then retune that size-limit row to the new measurement plus 10%.

### 3. Rank what is left

Run `pnpm size:visualize` on the post-5528 Provider-only graph. List inputs by bytes. The research already names likely leftovers (i18next, 15 locales, inlined core, zod via hooks, tailwind-merge, xstate, radix). Confirm they are still on the path. Do not guess.

### 4. Hillclimb the leftovers

One hypothesis per iteration. Ground each in the ranked list. Examples, not a promise.

- Provider still imports a dep it does not use (subtract the import).
- A heavy dep is only needed by the three split entries and leaked into the root file.
- CSS or locale weight that can move without a new public API.

Not in this loop. Lazy locales. Dropping `noExternal`. Replacing zod.

For each iteration. Change one thing. Measure with the frozen script. Run `pnpm size`, `pnpm check:tree-shaking`, UI unit tests, and the Vite example build. Keep only if Provider-only brotli drops by 5 KB or more and the gate stays green. Otherwise revert. Log the row either way.

### 5. Encode the floor

After the last keep, size-limit rows match the new numbers plus 10%. CONTRIBUTING names the Provider-only row. The measure script stays in the repo so a reviewer can rerun it.

## Gate (every unit)

```
pnpm turbo build --force
pnpm size
pnpm check:tree-shaking
pnpm --filter @youversion/platform-react-ui test
cd examples/vite-react && pnpm build
```

Unit 2 also runs the 5528 verification list in that spec.

## Trail

`.audit/bundle-size.tsv` (gitignored). One row per decision or iteration. Columns from show-me-your-work (`ts`, `phase`, `decision`, `why`, `evidence`, `result`).

## Rigor

High. A size regression ships to every partner. The harness freezes before cuts. One change, one measurement. No stacked untested diffs.
