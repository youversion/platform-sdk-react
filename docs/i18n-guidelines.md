# i18n Guidelines

User-facing strings in `@youversion/platform-react-ui` must go through i18next. English source strings are authored in the sibling **platform-localization** repository; this repo consumes assembled locale JSON via automated sync PRs.

## Source of truth

| What | Where |
|------|-------|
| English strings (canonical) | [`platform-localization/sources/common/en.json`](https://github.com/youversion/platform-localization) — `react.*` namespace |
| React locale bundles (this repo) | `packages/ui/src/i18n/locales/*.json` (every `*.json` in that directory; `en` is required) |
| Translation workflow | Crowdin (upload on merge, weekly download) |
| Downstream sync | `platform-localization` → **Distribute React Localization** (`distribute-react.yml`) → PRs authored by `platform-localization-pr-bot[bot]` (currently on the reused `chore/localization-sync-react` branch) |

See [platform-localization README](https://github.com/youversion/platform-localization/blob/main/README.md) and [distribution docs](https://github.com/youversion/platform-localization/blob/main/docs/distribution.md) for the full pipeline.

## Adding or changing strings

1. **Open a pull request on [platform-localization](https://github.com/youversion/platform-localization)** that edits `sources/common/en.json` under the `react.*` prefix.
2. Run `npm run generate && npm run validate` in platform-localization before that pull request merges. CI validates the same commands.
3. After that pull request merges, Crowdin upload runs automatically. **Distribute React Localization** (`distribute-react.yml`) then opens the sync pull request in this repo.
4. **Do not hand-edit any file under `packages/ui/src/i18n/locales/`**, including `en.json`. The locale-ownership gate rejects those edits unless the pull request author is `platform-localization-pr-bot[bot]`.
5. After translations are approved in Crowdin and the sync pull request merges here, keys appear in the translated bundles.

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

## Host-set language

By default the UI language follows `navigator.languages`. Pass `locale` on `YouVersionProvider` to set it explicitly — for example the React Native Expo SDK forwarding its provider `locale` into a WebView:

```tsx
<YouVersionProvider appKey="YOUR_APP_KEY" locale="es">
  <VerseOfTheDay />
</YouVersionProvider>
```

Regional tags such as `es-MX` resolve to a bundled locale (`es`). Unsupported tags fall back to English. Omit `locale` to keep browser detection. `locale` also sets `Accept-Language` on API calls unless the host already set that header.

This is app locale, not Bible translation language. Seed the version picker with `defaultLanguageId` on `BibleReader.Root`. Do not map `locale` to a Bible language. No new translation keys are needed for this; existing bundles (including Spanish `verseOfTheDay`) are used as-is.

## Local checks

```bash
# Hard fail: missing en keys, extra translation keys, interpolation tokens,
#            stale resources.generated.ts (index.ts only imports that file)
# Warn only: missing translation keys (upstream-owned), orphan en keys (unused in static scan)
# Dynamic t(`prefix_${x}`) keys: add to ORPHAN_KEY_ALLOWLIST in scripts/check-i18n-parity.mjs
pnpm check:i18n

# Hardcoded string lint (components only)
pnpm lint

# Locale ownership gate self-test (bash only, no install required)
pnpm test:ci-scripts
```

## CI

- **locale-ownership** job fails PRs that touch `packages/ui/src/i18n/locales/**` unless the PR author is `platform-localization-pr-bot[bot]`, the localization sync App. The branch name is deliberately not part of the check — upstream owns it and has changed it before ([ADR 0003](./adr/0003-locale-ownership-gate-keys-on-pr-author.md)). Follow [Adding or changing strings](#adding-or-changing-strings) instead.
- **i18n-check** job runs `pnpm check:i18n` on every PR.
- **Lint** job runs oxlint with `eslint-plugin-i18next` as a JS plugin, scoped to `packages/ui/src/components/**` (excluding `*.test.*` and `*.stories.*`).

## Key naming

- Flat camelCase keys in locale JSON (e.g. `shareAriaLabel`, `verseOfTheDay`).
- In platform-localization source, prefix with `react.` (e.g. `react.shareAriaLabel`).
- Interpolation tokens use `{{tokenName}}` and must match across every bundle once translations land.
