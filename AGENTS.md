# YouVersion Platform SDKs – Agent Guide

## QUICK FACTS
- Monorepo: pnpm workspaces + Turborepo
- Packages:
  - `@youversion/platform-core` (pure TS API clients)
  - `@youversion/platform-react-hooks` (React hooks layer)
  - `@youversion/platform-react-ui` (UI components)

## WHERE TO MAKE CHANGES

- **New or changed API endpoints / data types**
  → Add/update Zod schemas and clients in `packages/core`
- **New React data hooks / provider behavior**
  → Implement in `packages/hooks` using `@youversion/platform-core` clients
- **New visual components / styling / UX**
  → Implement in `packages/ui` using hooks from `@youversion/platform-react-hooks`

The dependency chain runs one way: core → hooks → ui. Never introduce a reverse
dependency.

## CRITICAL GOTCHAS

### Build & Dependencies
- Always rebuild dependent packages after modifying core or hooks
- Turbo build cache can skip changes - run `turbo build --force` if needed
- Workspace protocol: use `workspace:*` in package.json dependencies
- **Build tools differ per package**: core uses tsup, hooks uses tsc only, ui uses tsup + tsc. Don't assume one build shape across the monorepo.
- **API Extractor is listed but not actually used** — don't wire anything to it
- Each package is self-contained; there is no shared source directory

### Versioning & Release
- Changesets required for ALL version bumps (even patches)
- **Unified versioning**: All packages must share exact same version - never version packages independently
- Pre-commit hooks fail if typecheck or lint fails
- **Every PR must include a changeset** — CI (`.github/workflows/changeset.yml`) fails a PR that adds none. For a genuine no-release change (CI/docs/tooling), add an intentional empty changeset: `pnpm changeset --empty`. A missing changeset is what caused the 2026-07-17 release failure.
- **Trusted publishing**: npm publish is OIDC-based, no tokens involved

### Commits & PRs
- **PR titles must be Conventional Commits** — the PR title becomes the squash-merge commit on `main` and is linted by `.github/workflows/pr-title.yml`. Ticket refs (e.g. `YPE-1234`) go in the **branch name** and PR body, not the title.
- The per-commit husky/commitlint hook is an optional local dev aid; the PR title is the real gate.

### Environment
- **Node.js requirement**: Minimum version 22.13.0 required (pnpm 11 requires Node >= 22.13); we develop and test on Node 24 LTS, which is what CI runs. New dev-deps must support `engines.node >=22.13`; don't lower the floor to escape a dependency constraint without a deliberate decision (see `docs/release-hardening-decisions.md`, Decision 3).
- **React version**: Do not change React dependencies; pnpm overrides (in `pnpm-workspace.yaml`) enforce 19.1.2
- **Package manager**: Do not use npm/yarn; only pnpm supported. Git hooks prefer `corepack pnpm ...` (repo-pinned pnpm regardless of PATH) and fall back to `pnpm` where corepack isn't available (Node 25+ no longer bundles corepack). Keep the corepack-preferred/pnpm-fallback shape; don't hard-code bare `pnpm` only.
- **Supply-chain protection**: `minimumReleaseAge: 4320` (3-day cooldown) in `pnpm-workspace.yaml` — `pnpm install` will reject packages published < 3 days ago. Override with `--force` if needed urgently. Workspace packages (`workspace:*`) are inherently excluded as they aren't fetched from the registry.
- **pnpm 11 breaking changes**: Overrides moved from `package.json` → `pnpm-workspace.yaml`; build scripts require `allowBuilds` approval; `@internal/eslint-config` and `eslint-plugin-storybook` must be root devDependencies for resolution

### Package Boundaries (FOR AGENTS)
- **Core must remain React-free** – do not import React or DOM APIs in `packages/core`
- **Hooks should not duplicate core logic** – call core clients instead of re-implementing HTTP
- **UI should not talk to the network directly** – always use hooks/core
- **Tailwind CSS injection**: built CSS is embedded as a JS constant via tsup `define` and rendered by `YouVersionProvider` through React 19 `<style precedence>`. Consumers need no build step.

### Testing
Style adapted from [Kent C. Dodds / kody testing principles](https://github.com/kentcdodds/kody/blob/main/docs/contributing/testing-principles.md). Package AGENTS add the flavor matrix for that layer.

**Pick the lightest flavor that can falsify the behavior** (do not use “integration” as a style term — choose by capability):

| Flavor | Package | Use when |
| --- | --- | --- |
| Pure unit | core / hooks utils / ui lib | Pure functions, transformers, machines |
| Mocked client (MSW) | core | Client + Zod + error mapping against fake HTTP |
| Hook + provider + factories | hooks | Hook state/cache/auth against stubbed core clients |
| Component Vitest + RTL | ui | Behavior/a11y without Storybook chrome |
| Storybook `play` | ui | User-visible journeys that need real composition/slots |
| Live API (`INTEGRATION_TESTS=true`) | core | Tiny smoke that mocks cannot falsify |

**Musts for new and edited tests:**
- Prefer fewer, longer workflow tests; multiple related assertions in one test are fine
- Treat each test like a manual tester’s script; name it so intent is obvious
- Flat tests: one optional top-level `describe` for the module; no nested `describe`
- No `beforeEach`/`afterEach`; inline setup or call factories that return ready-to-run objects
- No shared mutable state across cases — if the next assertion needs the same subject, it belongs in the same test
- Don’t test what TypeScript already guarantees
- Assert behavior / stable contracts / roles — not i18n prose or instructional copy
- Prefer local fakes/fixtures; avoid the public internet by default
- High bar for slower flavors (Storybook play, live API) and for unlikely one-off regression tests
- Assert intermediate states inside the workflow that causes them

**Package ownership:** core owns HTTP+Zod+MSW; hooks own React state against stubbed clients; UI owns user-visible behavior against stubbed hooks/providers. Do not re-test a lower package’s contract unless the bug is at the boundary. Rare vertical smokes (e.g. highlight auth) may climb one rung for critical journeys.

**Scope:** bind on new/edited tests. When touching a file, bend the cases you edit toward this style — no mass rewrite of untouched suites.

**Before pushing:** run the full test suite across all packages — a change in one package can break another.

Legacy tooling labels (`INTEGRATION_TESTS`, Storybook `tags: ['integration']`, `*.integration.test.tsx`) stay as-is; they are CI/discovery tags, not a style vocabulary.

## MORE DETAIL PER PACKAGE

- `packages/core/AGENTS.md` – API clients, schemas, auth
- `packages/hooks/AGENTS.md` – React hooks, providers
- `packages/ui/AGENTS.md` – UI components, styling, build order

## Learned User Preferences

- When posting PR review comments on Cam's behalf, be concise, use https://conventionalcomments.org/, and attribute as Cursor review sent on behalf of Cam; confirm before posting when the action is unclear.
- Prefer aligning React SDK auth/UI flows, logos, and copy with the Swift and Kotlin sister SDKs when those already define the pattern.
- When the user shares a recording or insists on observed product behavior, re-investigate deeply rather than asserting they are wrong.
- For local auth, highlights, and Bible demos, use `examples/vite-react` and load env vars from the monorepo root (not worktree-local envs).
- Prefer Kent C. Dodds / kody-style testing guidance for new and edited tests (lightest falsifying flavor, fewer longer workflows); do not mass-rewrite untouched suites.

## Learned Workspace Facts

- Root and package `CLAUDE.md` files are symlinks to the matching `AGENTS.md` — edit `AGENTS.md` only.
- Bible chapter HTML from the API is YVDOM; consumers need transformed HTML before display — raw YVDOM (milestone verse markers, cross-paragraph verses, mixed footnotes) is not end-user-ready.
- Sister repos `platform-sdk-swift` and `platform-sdk-kotlin` are cross-platform references for Sign-In UI, logos, and i18n strings.
- Highlight auth UX: unsigned-in highlight opens Sign In with a highlights reason (permission included in that flow); a separate permission dialog is only for already-signed-in users missing scope — avoid sign-in then an immediate second dialog.
