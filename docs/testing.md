# Testing

Testing style adapted from [Kent C. Dodds / kody testing principles](https://github.com/kentcdodds/kody/blob/main/docs/contributing/testing-principles.md). This document owns the E2E-first rules; do not mass-rewrite untouched suites. Package ownership below defines each layer's test seams.

## Prefer E2E; isolate only failures the existing journeys miss

Highly prefer E2E tests as the sole testing mechanism for complex features. Use isolation tests only for real failures the existing journeys miss.

Before writing isolation tests, list the ways the system could fail and identify which ones the existing E2E and mocked browser journeys miss. Account for what their mocks bypass. Write those tests before implementation, never afterward; before deleting an existing test, preserve or replace its unique coverage. Do not use "integration" as a style term — choose by capability:

| Flavor | Package | Use when |
| --- | --- | --- |
| E2E | examples | Complex behavior through the running app; produce a repeatable artifact with the command, inputs, and result at the end |
| Pure unit | core / hooks utils / ui lib | Pure functions, transformers, machines |
| Mocked client (MSW) | core | Client + Zod + error mapping against fake HTTP |
| Hook + provider + factories | hooks | Hook state/cache/auth against stubbed core clients |
| Component Vitest + RTL | ui | Behavior/a11y without Storybook chrome |
| Storybook `play` | ui | Mocked browser journeys for user-visible composition/slots; not full app E2E |
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
- High bar for isolation tests that duplicate E2E coverage and for unlikely one-off regression tests
- Assert intermediate states inside the workflow that causes them

## Package ownership

Core owns client HTTP and Zod tests with their MSW server; hooks own React state against stubbed clients; UI owns user-visible behavior against stubbed hooks/providers. Do not re-test a lower package's contract unless the bug is at the boundary. Rare vertical smokes (e.g. highlight auth) may climb one rung for critical journeys.

- **Core:** Vitest runs in Node. For HTTP contract failures E2E cannot reach, use mocked-client workflows
  using the shared MSW server from `packages/core/src/__tests__/setup.ts`, which
  loads `handlers.ts` and manages the server lifecycle. Override responses inside
  tests with `server.use(...)`. Live API smokes stay tiny and opt-in with
  `INTEGRATION_TESTS=true`.
- **Hooks:** Vitest uses jsdom and React Testing Library. Stub core clients with
  factories under `packages/hooks/src/__tests__/mocks`; wrap hooks in the real
  provider through ready-to-run wrapper factories. Hook tests do not use MSW or
  re-test HTTP or Zod parsing.
- **UI:** For isolation tests that catch failures E2E journeys miss, use Vitest, jsdom, and React Testing Library with
  `packages/ui/src/test/setup.ts`. Stub hook results with
  `YouVersionContext.hookOverrides` through `HookOverrideProvider` in
  `packages/ui/src/test/hook-overrides.tsx`, not `vi.mock` of
  `@youversion/platform-react-hooks`. In component unit tests, use network access
  only for intentional vertical smokes. Assert roles and behavior, not localized copy blobs. Use
  Storybook `play` when composition or slots matter; tag each journey with
  `tags: ['integration']` so CI discovers it. Storybook has its own MSW handlers in
  `packages/ui/src/test/mocks/handlers.ts`, wired through `packages/ui/.storybook/preview.tsx`.

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
Playwright's Chromium, plus an app-key setting. Set `YVP_APP_KEY` in the root `.env`
or shell, or supply `STORYBOOK_YOUVERSION_APP_KEY` directly;
`packages/ui/.storybook/main.ts` maps the generic key to the Storybook setting.
Without it, the preview renders a
Missing Environment Variables warning instead of the SDK. See
[environment setup](./cursor-cloud.md#env-files-gitignored).

On a machine without the browser, install it through the UI
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
`--project storybook` selects browser journeys only. These journeys use the UI MSW
handlers, but the preview sets `onUnhandledRequest: 'warn'`, so unmatched requests
can reach the network. CI configures the API host and app key for those requests;
use a real app key when live API access is needed. Passing tests alone do not prove
that all requests were mocked. Check the executed test count: a successful run with
every test skipped does not verify the story.

For coverage across all packages, run `pnpm build` followed by `pnpm test:coverage`;
the coverage script calls package scripts directly.

## Scope

Bind on new/edited tests. When touching a file, bend the cases you edit toward this style — no mass rewrite of untouched suites.

## Env

Missing `YVP_API_HOST` or other env files: read `docs/cursor-cloud.md`.

## Before pushing

Run the full test suite across all packages — a change in one package can break another.

Legacy tooling labels (`INTEGRATION_TESTS`, Storybook `tags: ['integration']`, `*.integration.test.tsx`) stay as-is; they are CI/discovery tags, not a style vocabulary.
