---
name: verify-sdk-demo
description: Drive the YouVersion SDK Demo (Vite React web UI at examples/vite-react) to prove Bible Reader, Verse of the Day, Bible Card, sign-in chrome, and theme behavior. Use when verifying UI changes, demo regressions, or live API integration in the example app.
---

# Verify the YouVersion SDK Demo

This repo is an SDK monorepo. The surface a user actually touches is the Vite demo in `examples/vite-react` (page title **YouVersion SDK Demo**). It hosts `@youversion/platform-react-ui` against the live YouVersion Platform API.

Other surfaces (do not treat as the primary harness unless the change is isolated there):

- Storybook on port 6006 (`pnpm --filter @youversion/platform-react-ui storybook`) — mocked/composition journeys, not the demo.
- Package unit/RTL/Storybook `play` tests — not a substitute for driving the demo.
- Hosted demo at https://youversion.github.io/platform-sdk-react/ — production build, not this checkout.

There is no local API, Docker Compose, or database. Scripture comes from `api.youversion.com`.

## Launch

From the monorepo root, after `pnpm install` and `pnpm build` (`packages/ui` exports only `dist/`):

```bash
.cursor/skills/verify-sdk-demo/scripts/launch.sh
```

That starts:

```bash
pnpm --filter vite-react dev --host 127.0.0.1 --port 5177
```

Do **not** insert an extra `--` before `--host`. `pnpm --filter vite-react dev -- --host 127.0.0.1` becomes `vite -- --host 127.0.0.1`; Vite then ignores `--host` and may bind `::1` only, so `curl http://127.0.0.1:5177` fails. Root `pnpm dev:web` is stale (it still filters a removed `nextjs` package).

**Ready when** `curl -fsS http://127.0.0.1:5177/` returns HTML containing `YouVersion SDK Demo` and launch prints `ready pid=… origin=http://127.0.0.1:5177`. Instance metadata is `${VERIFY_DIR:-/tmp/verify-sdk-demo}/instance.json`.

**Env** (never commit secrets). `launch.sh` loads in this order and only exports into the Vite process:

1. Already-set `VITE_YVP_APP_KEY`
2. Monorepo-root `.env.local` / `.env` (AGENTS.md: use the main checkout, not a worktree-local file)
3. `examples/vite-react/.env.local` if the Vite-prefixed key is still empty
4. `YVP_APP_KEY` mapped to `VITE_YVP_APP_KEY` (Cloud injects this secret)

Without a non-empty app key, `YouVersionProvider` replaces the whole tree with the missing-app-key `role="alert"` panel. Bible features are not driveable.

`VITE_YVP_AUTH_REDIRECT_URL` defaults to the launch origin (`http://127.0.0.1:5177`). Navbar Sign in requests only `profile` and `email`. Highlights are granted later in the reader (tap a verse, tap a color).

Override isolation with `VERIFY_HOST`, `VERIFY_PORT`, `VERIFY_DIR`. Default port is **5177** so a human demo on 5173 is left alone.

## Doctor

```bash
.cursor/skills/verify-sdk-demo/scripts/doctor.sh
```

Read-only. Answers “is this instance worth driving?”

1. `${VERIFY_DIR}/instance.json` exists and the recorded pid is alive.
2. Something is listening on the instance origin, and that listener is our pid or a child of it. If the port belongs to someone else, **stop** — do not drive a shared session.
3. `GET /` is 200 and the shell title is `YouVersion SDK Demo`.
4. Playwright probe (`node …/drive.mjs doctor`): desktop nav **Bible Reader** is present, the missing-app-key alert is absent, and `[data-slot="yv-bible-renderer"]` plus at least one `.yv-v[v]` verse wrapper have loaded.

If step 4 fails with the missing-app-key copy, relaunch after setting `VITE_YVP_APP_KEY` / `YVP_APP_KEY`. If packages were edited, `pnpm build` (or `turbo build --force` when the cache looks stale) and relaunch.

## Drive

Harness: Playwright from `@youversion/platform-react-ui` (`playwright` 1.56), launching system Chrome (`/usr/local/bin/google-chrome` or `VERIFY_CHROME`). Default viewport **1280×800** so the desktop navbar is visible (`hidden md:flex` below `md`).

```bash
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs bible-reader
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs verse-of-the-day
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs bible-card
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs theme
```

The demo is a client-side page switcher (`App` state: `bible-reader` | `votd` | `bible-card`), not a router. There are no URL paths. Desktop nav buttons:

| Visible name | Page |
| --- | --- |
| Bible Reader | default |
| Verse of the Day | `votd` |
| Bible Card | `bible-card` |

Mobile: `getByRole('button', { name: 'Toggle menu' })` then the same labels.

Stable SDK handles (English locale; prefer roles over copy blobs when asserting):

| Control | Handle |
| --- | --- |
| Scripture body | `[data-slot="yv-bible-renderer"]` |
| A verse | `.yv-v[v="1"]` (attribute `v` is the verse number) |
| Selected verse | `.yv-v-selected` |
| Previous / next chapter | `getByRole('button', { name: /previous chapter/i })` / `/next chapter/i` |
| Book + chapter picker | `getByRole('button', { name: /change bible book and chapter/i })` |
| Version picker | `getByRole('button', { name: /change bible version/i })` |
| Reader settings | `getByRole('button', { name: /settings/i })` |
| Font size | `getByTestId('increase-font-size')` / `decrease-font-size` |
| Line spacing | `getByTestId('line-spacing')` |
| Verse actions | `getByRole('dialog', { name: /verse actions/i })` |
| Highlight colors | `getByRole('group', { name: /highlight colors/i })` |
| Passage loading | `getByRole('status', { name: /loading passage/i })` |
| Sign in (navbar, `size="short"`) | `getByRole('button', { name: /^sign in$/i })` |
| Sign out (navbar) | `getByRole('button', { name: /^sign out$/i })` |
| Theme | `getByRole('button', { name: 'Toggle theme' })` then menuitems Light / Dark / System |
| Missing app key | `getByRole('alert')` (replaces the whole app) |
| SDK scope | `[data-yv-sdk]` |

Reader defaults in this demo: book `JHN`, chapter `1`, version id `3034` (license-free default). VOTD and Bible Card also use `3034`. Bible Card reference is `JHN.3.16`.

Feature recipes: `.cursor/skills/verify-sdk-demo/features/`. A proof that only hits one entry point is incomplete when the map lists others for that change.

Do not complete YouVersion OAuth in an unattended run unless a real account and a registered redirect for this origin exist. Navbar Sign in starts PKCE and leaves the demo. Highlights are per Bible version and need the highlights permission (reader color tap, not the navbar button).

## Evidence

Proof artifacts go to **`/tmp/verify-sdk-demo/evidence/`** (`VERIFY_EVIDENCE_DIR` to override). Cleanup must not delete this directory.

Each drive writes a timestamped folder:

- `01-*.png` / `02-*.png` — state **before** the action and **after**
- `result.json` — origin, feature, `ok`, and the observable that changed (picker label, heading, `localStorage`)

Standards:

- Exercise the real demo (Vite + live API), not Storybook, not `YouVersionContext.hookOverrides`, not test-only endpoints.
- Capture the action and the resulting state, not only the final screen.
- Side effects to observe: `localStorage` keys `yv-sdk-demo-theme`, `youversion-platform:reader:font-size`, `youversion-platform:reader:font-family`; verse class `yv-v-selected`; network calls to `api.youversion.com` when diagnosing load failures.
- Mocks only where the production boundary already isolates the system (Storybook MSW). The demo has no mock mode.

## Cleanup

```bash
.cursor/skills/verify-sdk-demo/scripts/cleanup.sh
```

Kills **only** the pid recorded in `instance.json` (the `pnpm --filter vite-react dev` process this launch started). Never `pkill vite` / `pkill node`. Removes `instance.json`. Leaves `/tmp/verify-sdk-demo/evidence/` and the last `vite.log` (overwritten on the next launch).

## Isolate

Two Vite processes can run side by side on different ports. Default verification port is 5177. A developer demo on 5173 is a **different origin** (theme and reader `localStorage` are origin-scoped) but must not be driven or killed.

- If `instance.json` already points at a live pid, `launch.sh` refuses a second start in the same `VERIFY_DIR`.
- If port 5177 is owned by some other process, launch refuses.
- For a second instance: `VERIFY_DIR=/tmp/verify-sdk-demo-b VERIFY_PORT=5178 …/launch.sh`.
- Never attach Playwright to an origin you did not start.

## Helpers

All invocations are from the monorepo root. Shell scripts are executable.

| Script | Command |
| --- | --- |
| Launch | `.cursor/skills/verify-sdk-demo/scripts/launch.sh` |
| Doctor | `.cursor/skills/verify-sdk-demo/scripts/doctor.sh` |
| Drive | `node .cursor/skills/verify-sdk-demo/scripts/drive.mjs <feature>` |
| Cleanup | `.cursor/skills/verify-sdk-demo/scripts/cleanup.sh` |

`scripts/lib.sh` is sourced by the shell helpers (paths, env load, port pid). `drive.mjs` resolves `playwright` from `packages/ui`. Chrome needs `--no-sandbox` in this Cloud image; the script passes that.

## Feature map

Index: `.cursor/skills/verify-sdk-demo/features/README.md`.
