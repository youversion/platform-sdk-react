# 5. Oxlint is the only linter; TypeScript 7 is the compiler

Date: 2026-08-19

## Status

Accepted

## Context

`pnpm lint` ran ESLint (typed `typescript-eslint`, React hooks, `i18next/no-literal-string`) and oxlint anti-slop. Oxlint can own the first two once type-aware rules run. Those rules need `oxlint-tsgolint`, which follows TypeScript 7. This repo was on TypeScript 5.9.3. Keeping a thin ESLint would have been the smaller jump.

## Decision

Upgrade the repo to TypeScript 7. Run type-aware oxlint and load `eslint-plugin-i18next` as an oxlint JS plugin. Delete ESLint only after that pair reports nothing ESLint still owns. One pull request. If TypeScript 7 or type-aware oxlint is blocked, stop before the delete. Do not turn rules off to force the move.

## Why

A leftover ESLint is a second lint stack. TypeScript 7 is current and is what tsgolint expects. Dual-run inside the same PR is how we know the gate did not thin out. A stop before delete is better than a green CI that no longer catches floating promises or hardcoded UI strings.

## Consequences

TypeScript 7 has no compiler API. `typescript-eslint` 8.56 crashes on load (`Cannot read properties of undefined (reading 'Cjs')`). Dual-run ESLint after the compiler jump was not possible. Type-aware oxlint plus `eslint-plugin-i18next` as a JS plugin is the lint gate. Core declaration emit uses `tsc`, not `tsup --dts`.
