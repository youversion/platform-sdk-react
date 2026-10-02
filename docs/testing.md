# Testing

Testing style adapted from [Kent C. Dodds / kody testing principles](https://github.com/kentcdodds/kody/blob/main/docs/contributing/testing-principles.md). Prefer the lightest falsifying flavor; do not mass-rewrite untouched suites. Package ownership below defines each layer's test seams.

## Pick the lightest flavor that can falsify the behavior

Do not use "integration" as a style term — choose by capability:

| Flavor | Package | Use when |
| --- | --- | --- |
| Pure unit | core / hooks utils / ui lib | Pure functions, transformers, machines |
| Mocked client (MSW) | core | Client + Zod + error mapping against fake HTTP |
| Hook + provider + factories | hooks | Hook state/cache/auth against stubbed core clients |
| Component Vitest + RTL | ui | Behavior/a11y without Storybook chrome |
| Storybook `play` | ui | User-visible journeys that need real composition/slots |
| Live API (`INTEGRATION_TESTS=true`) | core | Tiny smoke that mocks cannot falsify |

## Musts for new and edited tests
- Prefer fewer, longer workflow tests; multiple related assertions in one test are fine
- Treat each test like a manual tester's script; name it so intent is obvious
- Flat tests: one optional top-level `describe` for the module; no nested `describe`
- No `beforeEach`/`afterEach`; inline setup or call factories that return ready-to-run objects
- No shared mutable state across cases — if the next assertion needs the same subject, it belongs in the same test
- Don't test what TypeScript already guarantees
- Assert behavior / stable contracts / roles — not i18n prose or instructional copy
- Prefer local fakes/fixtures; avoid the public internet by default
- High bar for slower flavors (Storybook play, live API) and for unlikely one-off regression tests
- Assert intermediate states inside the workflow that causes them

## Package ownership

core owns HTTP+Zod+MSW; hooks own React state against stubbed clients; UI owns user-visible behavior against stubbed hooks/providers. Do not re-test a lower package's contract unless the bug is at the boundary. Rare vertical smokes (e.g. highlight auth) may climb one rung for critical journeys.

- **Core:** Vitest runs in Node. Prefer mocked-client workflows for API clients
  and shared MSW handlers/factories under `packages/core/src/__tests__/`, such as
  `handlers.ts`. Import or call them inside each test. Live API smokes stay tiny
  and opt-in with `INTEGRATION_TESTS=true`.
- **Hooks:** Vitest uses jsdom and React Testing Library. Stub core clients with
  factories under `packages/hooks/src/__tests__/mocks`; wrap hooks in the real
  provider through ready-to-run wrapper factories. Core owns MSW; hook tests do
  not re-test HTTP or Zod parsing.
- **UI:** Default to Vitest, jsdom, and React Testing Library with
  `packages/ui/src/test/setup.ts`. Stub hook results with
  `YouVersionContext.hookOverrides` through `HookOverrideProvider` in
  `packages/ui/src/test/hook-overrides.tsx`, not `vi.mock` of
  `@youversion/platform-react-hooks`. Network access belongs only in intentional
  vertical smokes. Assert roles and behavior, not localized copy blobs. Use
  Storybook `play` when composition or slots matter; tag each journey with
  `tags: ['integration']` so CI discovers it.

## Run tests with their dependencies

Run these commands from the repository root after `pnpm install --frozen-lockfile`.

For a package's full unit suite, use Turbo so dependency bundles build first:

```bash
pnpm exec turbo test --filter=@youversion/platform-react-hooks
```

Replace the filter with the core or UI package name as needed. `pnpm test` uses the
same dependency-aware path for all packages. Direct package scripts and `exec vitest`
bypass Turbo's build prerequisites.

For selected hook or UI files, finish the dependency build before starting Vitest:

```bash
# Builds core, then hooks, including the test-utils export used by UI tests.
pnpm exec turbo build --filter=@youversion/platform-react-hooks
pnpm --filter @youversion/platform-react-hooks exec vitest run src/useChapter.test.tsx
pnpm --filter @youversion/platform-react-ui exec vitest run --project unit src/components/verse.test.tsx
```

Change the file paths to match your task. For core files, use
`pnpm --filter @youversion/platform-core exec vitest run src/__tests__/client.test.ts`.
Keep builds and test runs sequential: rebuilding a dependency deletes its `dist`
directory while tests may still be importing it. If build output is stale, add
`--force` to the Turbo build command.

### Storybook browser journeys

Storybook needs built workspace dependencies, production CSS, story-only CSS, and
Playwright's Chromium. On a machine without the browser, install it through the UI
package with `pnpm --filter @youversion/platform-react-ui exec playwright install chromium`.
If Playwright reports missing Linux system libraries, use its `install --with-deps chromium`
option on a disposable development machine.

```bash
pnpm exec turbo build --filter=@youversion/platform-react-ui
pnpm --filter @youversion/platform-react-ui build:storybook-css
pnpm --filter @youversion/platform-react-ui exec vitest run --project storybook src/components/verse.stories.tsx
```

Omit the file path to run all discovered Storybook journeys. The `integration` story
tag controls discovery. `test:integration` currently runs both Vitest projects;
`--project storybook` selects browser journeys only. These journeys use mocked HTTP,
not the live API. Check the executed test count: a successful run with every test
skipped does not verify the story.

For coverage across all packages, run `pnpm build` followed by `pnpm test:coverage`;
the coverage script calls package scripts directly.

## Scope

Bind on new/edited tests. When touching a file, bend the cases you edit toward this style — no mass rewrite of untouched suites.

## Env

Missing `YVP_API_HOST` or other env files: read `docs/cursor-cloud.md`.

## Before pushing

Run the full test suite across all packages — a change in one package can break another.

Legacy tooling labels (`INTEGRATION_TESTS`, Storybook `tags: ['integration']`, `*.integration.test.tsx`) stay as-is; they are CI/discovery tags, not a style vocabulary.
