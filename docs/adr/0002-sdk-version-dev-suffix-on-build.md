# 2. Suffix the X-YVP-Sdk version with `-dev` for non-published builds

Date: 2026-07-15

## Status

Accepted

## Context

Every request carries an `X-YVP-Sdk: ReactSDK={version}` header so platform
telemetry can attribute traffic to the SDK. The tech lead's requirement: the
value must differentiate **internal YouVersion dev-time traffic** from
**published partner traffic** (the released SDK used outside YV).

Before this change, `SDK_VERSION` was `pkg.version`, which `tsup` inlines on
**every** build. A build from source and a published install both reported
`ReactSDK=2.2.0`, so the two were indistinguishable. The dev/partner split the
tech lead asked for did not exist.

The React Native Expo SDK (platform-sdk-reactnative-expo#85) solved the same
requirement differently: it hardcodes a `Dev` sentinel in source and a
`prepublishOnly` script string-rewrites the compiled output to the real version.
That approach exists because `expo-module build` does not inline anything. It
also fails-hard if the sentinel is missing or duplicated.

## Decision

Keep `package.json` as the single source of the version, and vary only a
suffix by build channel:

- Source/dev/test builds report `ReactSDK={version}-dev`.
- Published builds report `ReactSDK={version}`.

Mechanism (`packages/core`):

- `src/version.ts` reads a build-time flag: `SDK_VERSION = isPublishBuild ?
  pkg.version : `${pkg.version}-dev``.
- `tsup.config.ts` replaces `process.env.YVP_PUBLISH_BUILD` at build time via
  tsup's `env` option, so the flag folds to a constant (works in the browser
  bundle, where `process` is undefined).
- `prepublishOnly` sets `YVP_PUBLISH_BUILD=true`, so every `npm publish`
  produces a stamped build; any other build stays `-dev`.
- A publish guard (`scripts/check-sdk-version-stamp.mjs`) aborts the publish
  unless the artifact carries the folded `isPublishBuild = true` stamp. It
  asserts that positive stamp rather than matching `-dev` for two reasons. A
  `-dev` string match would false-positive, because the compiled ternary keeps
  the suffix in its (dead) else branch in every build. And checking only that
  `isPublishBuild = false` is absent would fail **open**: if build tooling ever
  minified the constant away, neither literal would survive and a dev build
  would sail through. Requiring the stamp fails closed instead — a build whose
  channel cannot be confirmed aborts the publish.

`@youversion/platform-react-ui` and `@youversion/platform-react-hooks` import
core at runtime and bake no version. The stamp lives in published core. UI
`prepublishOnly` rebuilds core with `YVP_PUBLISH_BUILD=true` and runs the same
guard on core.

## Why this differs from the React Native SDK

We inject at build time via tsup's native `env`/`define` instead of rewriting
compiled output, because `tsup` (unlike `expo-module build`) supports it. Porting
the RN post-build rewrite would import fragility this repo does not need: the
Web SDK emits cjs + esm across three entry points, so RN's "exactly one `Dev`
occurrence" guard would not hold. The tech lead's requirement is the dev/partner
split (the outcome), not the stamping mechanism, so matching the outcome while
using the tool's native capability is the right trade-off.

`-dev` (a semver prerelease tag) was chosen over RN's bare `Dev`: it keeps the
version line in dev traffic (`2.2.0-dev` tells you which release the dev traffic
came from, where bare `Dev` does not) and makes the telemetry filter a simple
`endsWith('-dev')`.

## Consequences

- Published header value is unchanged (`ReactSDK=2.2.0`); only source/dev builds
  change (now `-dev`).
- Publishing outside the `prepublishOnly` lifecycle (e.g. a raw `tsup` build then
  manual `npm publish`) is caught by the guard and aborts.
- Enabling `minify` (or `minifyIdentifiers`) in either tsup config will trip the
  guard: the `isPublishBuild` literal no longer survives, so the stamp cannot be
  confirmed and the publish aborts until the guard is taught the new output
  shape. That is the intended trade — a loud, fixable abort beats silently
  tagging partner traffic as `-dev`.
- `prepublishOnly` uses POSIX inline env syntax (`YVP_PUBLISH_BUILD=true ...`).
  Publishing from Windows would need `cross-env`; CI (Linux) and maintainers
  (macOS) are unaffected.
