# i18n Guidelines

User-facing strings in `@youversion/platform-react-ui` must go through i18next. English source strings are authored in the sibling **platform-localization** repository; this repo consumes assembled locale JSON via automated sync PRs.

## Source of truth

| What | Where |
|------|-------|
| English strings (canonical) | [`platform-localization/sources/common/en.json`](https://github.com/youversion/platform-localization) — `react.*` namespace |
| React locale bundles (this repo) | `packages/ui/src/i18n/locales/*.json` (currently `en`, `fr`, `es`, `ko`, `tr`, `zh`) |
| Translation workflow | Crowdin (upload on merge, weekly download) |
| Downstream sync | `platform-localization` → **Distribute React Localization** (`distribute-react.yml`) → PRs authored by `platform-localization-pr-bot[bot]` (currently on the reused `chore/localization-sync-react` branch) |

See [platform-localization README](https://github.com/youversion/platform-localization/blob/main/README.md) and [distribution docs](https://github.com/youversion/platform-localization/blob/main/docs/distribution.md) for the full pipeline.

## Adding or changing strings

1. **Edit English in platform-localization** — add keys under the `react.*` prefix in `sources/common/en.json`.
2. Run `npm run generate && npm run validate` in platform-localization.
3. Open a PR there; after merge, Crowdin upload runs automatically.
4. **Do not hand-edit non-English bundles in this repo** — they are synced from `dist/react/*.json` via `distribute-react.yml`.
5. After translations are approved in Crowdin and the sync PR merges here, keys appear in the translated bundles.

To import existing React keys into platform-localization for the first time:

```bash
# In platform-localization
npm run import:react -- /path/to/platform-sdk-react/packages/ui/src/i18n/locales/en.json
```

## Adding a new language

A sync PR only drops the bundle in `locales/`. The bundle is inert until it is registered:

1. Import it in `packages/ui/src/i18n/index.ts` and add it to the `resources` map. `supportedLngs` — and therefore browser-language detection — derives from that map, so an unregistered bundle never renders.
2. Add coverage in `packages/ui/src/i18n/index.test.ts` for the new tag.

`pnpm check:i18n` hard-fails on any locale file missing from `resources`, so this cannot silently regress. Keys a bundle has not translated yet fall back to English per key.

Integration tests pin `navigator.languages` to English in `packages/ui/.storybook/vitest.setup.ts`; story play functions assert English copy, and without the pin a dev machine preferring a shipped locale would render that bundle instead.

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
# Hard fail: missing en keys, extra translation keys, interpolation tokens,
#            locale files not registered in i18n/index.ts
# Warn only: missing translation keys (upstream-owned), orphan en keys (unused in static scan)
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
- Interpolation tokens use `{{tokenName}}` and must match across every bundle once translations land.
