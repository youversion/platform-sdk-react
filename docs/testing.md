# Testing

Testing style adapted from [Kent C. Dodds / kody testing principles](https://github.com/kentcdodds/kody/blob/main/docs/contributing/testing-principles.md). Prefer the lightest falsifying flavor; do not mass-rewrite untouched suites. Package `AGENTS.md` files add each layer's flavor matrix.

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

core owns HTTP+Zod+MSW; hooks own React state against stubbed clients; UI owns user-visible behavior against stubbed hooks/providers. Stub UI hook results with `YouVersionContext.hookOverrides` (see `packages/ui/src/test/hook-overrides.tsx`), not `vi.mock`. Do not re-test a lower package's contract unless the bug is at the boundary. Rare vertical smokes (e.g. highlight auth) may climb one rung for critical journeys.

Remount tests for opted-in Bible reads live in hooks and must stay. Core owns the `parseCachePolicy` table. See `docs/bible-read-cache.md`.

## Scope

Bind on new/edited tests. When touching a file, bend the cases you edit toward this style — no mass rewrite of untouched suites.

## Env

Missing `YVP_API_HOST` or other env files: read `docs/cursor-cloud.md`.

## Before pushing

Run the full test suite across all packages — a change in one package can break another.

Legacy tooling labels (`INTEGRATION_TESTS`, Storybook `tags: ['integration']`, `*.integration.test.tsx`) stay as-is; they are CI/discovery tags, not a style vocabulary.
