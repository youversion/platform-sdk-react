# i18n Guidelines

User-facing strings in `@youversion/platform-react-ui` must go through i18next. English source strings are authored in the sibling **platform-localization** repository; this repo consumes assembled locale JSON via automated sync PRs.

## Source of truth

| What | Where |
|------|-------|
| English strings (canonical) | [`platform-localization/sources/common/en.json`](https://github.com/youversion/platform-localization) — `react.*` namespace |
| React locale bundles (this repo) | `packages/ui/src/i18n/locales/{en,fr,es}.json` |
| Translation workflow | Crowdin (upload on merge, weekly download) |
| Downstream sync | `platform-localization` → **Distribute React Localization** (`distribute-react.yml`) → PRs authored by `platform-localization-pr-bot[bot]` (currently on the reused `chore/localization-sync-react` branch) |

See [platform-localization README](https://github.com/youversion/platform-localization/blob/main/README.md) and [distribution docs](https://github.com/youversion/platform-localization/blob/main/docs/distribution.md) for the full pipeline.

## Adding or changing strings

1. **Edit English in platform-localization** — add keys under the `react.*` prefix in `sources/common/en.json`.
2. Run `npm run generate && npm run validate` in platform-localization.
3. Open a PR there; after merge, Crowdin upload runs automatically.
4. **Do not hand-edit `fr.json` or `es.json` in this repo** — they are synced from `dist/react/*.json` via `distribute-react.yml`.
5. After translations are approved in Crowdin and the sync PR merges here, keys appear in `fr.json` / `es.json`.

To import existing React keys into platform-localization for the first time:

```bash
# In platform-localization
npm run import:react -- /path/to/platform-sdk-react/packages/ui/src/i18n/locales/en.json
```

## Adding a new locale

When platform-localization adds a new translation locale and the sync PR lands a new JSON file under `packages/ui/src/i18n/locales/`:

1. **Do not hand-edit `packages/ui/src/i18n/index.ts`** — it imports from the generated resources file; locale registration is handled by the generator, not manual imports.
2. **Do not hand-edit `resources.generated.ts`** — it is auto-generated.
3. Run `pnpm generate:i18n` from the repo root (or `pnpm --filter @youversion/platform-react-ui generate:i18n`).
4. Commit the updated `packages/ui/src/i18n/resources.generated.ts` alongside the new locale JSON.
5. Run `pnpm check:i18n` — CI will fail if the generated file is stale.

The generator discovers all `*.json` files in `locales/`, requires `en.json`, sorts locales with `en` first then alphabetically, and emits static imports for the tsup bundle.

## Using strings in components

Use `useTranslation` + `t()` for simple strings and `Trans` with `i18nKey` for rich markup:

```tsx
const { t } = useTranslation(undefined, { i18n });

<button aria-label={t('shareAriaLabel')}>{t('share')}</button>

<Trans
  i18nKey="signInWithYouVersion"
  i18n={i18n}
  components={{ bold: <span className="yv:font-bold" /> }}
/>
```

Never hardcode user-facing text in JSX attributes (`aria-label`, `title`, `placeholder`, `alt`) or visible copy.

## Local checks

```bash
# Hard fail: missing en keys, extra fr/es keys, interpolation tokens
# Warn only: missing fr/es keys (upstream-owned), orphan en keys (unused in static scan)
# Dynamic t(`prefix_${x}`) keys: add to ORPHAN_KEY_ALLOWLIST in scripts/check-i18n-parity.mjs
pnpm check:i18n

# Hardcoded string lint (components only)
pnpm lint

# Locale ownership gate self-test (bash only, no install required)
pnpm test:ci-scripts
```

## CI

- **locale-ownership** job fails PRs that touch `packages/ui/src/i18n/locales/**` unless the PR author is `platform-localization-pr-bot[bot]`, the localization sync App. The branch name is deliberately not part of the check — upstream owns it and has changed it before ([ADR 0003](./adr/0003-locale-ownership-gate-keys-on-pr-author.md)). Add English strings upstream in platform-localization instead.
- **i18n-check** job runs `pnpm check:i18n` on every PR.
- **Lint** job runs ESLint with `eslint-plugin-i18next` scoped to `packages/ui/src/components/**` (excluding `*.test.*` and `*.stories.*`).

## Key naming

- Flat camelCase keys in locale JSON (e.g. `shareAriaLabel`, `verseOfTheDay`).
- In platform-localization source, prefix with `react.` (e.g. `react.shareAriaLabel`).
- Interpolation tokens use `{{tokenName}}` and must match across en/fr/es once translations land.
