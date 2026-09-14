# Cursor Cloud

This repo is an SDK monorepo, not a backend. There is no Docker Compose, database, or local API to start. The only long-running process for a product walkthrough is the Vite demo (`examples/vite-react`), which talks to the hosted YouVersion Platform API.

Standard install/lint/test/build/dev commands live in `CONTRIBUTING.md` and root `package.json`.

## Env files (gitignored)

Copy the root environment template and add a real app key when live API access is needed:

```bash
cp .env.example .env
```

The root `.env` configures core integration tests, Storybook, and the Vite demo. Mocked tests and
builds do not require it. Existing package-local `.env.local` files remain supported as optional
harness-specific overrides. Shell and CI variables take precedence over files.

Get a real app key from https://platform.youversion.com. Without `YVP_APP_KEY` or a
harness-specific app-key override, the demo and Storybook render the SDK missing-app-key panel,
and live core integration tests remain skipped.

## Running the demo

Start the demo and its workspace dependency watchers with:

```bash
pnpm dev:web
```

## Live core client

After `pnpm build`, source the root `.env` and pass those values into `ApiClient`. Test scripts load
the root file via `dotenv-cli`; the runtime client reads only the config object you give it.

```bash
set -a && . .env && set +a
cd packages/core
```

```js
import { ApiClient, BibleClient } from '@youversion/platform-core';

const apiClient = new ApiClient({
  appKey: process.env.YVP_APP_KEY,
  apiHost: process.env.YVP_API_HOST,
});
const bibleClient = new BibleClient(apiClient);
await bibleClient.getPassage(3034, 'JHN.3.16', 'text');
```

Auth/highlights also need a YouVersion account and a registered redirect URL (`http://localhost:5173` for the demo). Storybook is optional (`pnpm --filter @youversion/platform-react-ui storybook`, port 6006).
