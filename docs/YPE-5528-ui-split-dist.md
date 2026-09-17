# YPE-5528: Split UI distribution

## Decision

Publish each public UI component as an internal build entry while keeping the package root as the only public import path. A named root import can then drop unrelated components without changing consumer code.

The split also keeps `@youversion/platform-core` external to the UI build so UI and hooks share one runtime copy. Provider chrome, component utilities, and Bible reader typography remain separate internal style modules so a lightweight component does not embed every stylesheet.

This change does not alter localization behavior or add public subpaths.

## Constraints

- Preserve the package-root ESM and CommonJS export sets.
- Keep the explicit entry list aligned with the public component barrel.
- Keep styles available through both React injection and the existing `./styles.css` export.
- Start builds from an empty `dist` so stale chunks cannot publish.
- Do not use a component glob, which would publish tests and internal modules.
- Measure consumer imports, not the size of the root re-export file.

## Verification

After a forced build:

```sh
pnpm check:tree-shaking
pnpm size
pnpm --filter @youversion/platform-react-ui test
pnpm --filter @youversion/platform-react-ui test:integration
pnpm --filter vite-react build
```

The tree-shaking fixture proves that a Provider-only import excludes reader and picker sentinels while retaining Provider styles. Control imports prove that the sentinels are live. Size-limit guards the Provider-only and full-barrel consumer bundles.
