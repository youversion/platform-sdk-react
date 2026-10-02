# @youversion/platform-core

Pure TypeScript API clients and framework-agnostic Bible rendering resources. This package has zero React dependencies.

Keep this file brief. Put task-specific guidance behind a pointer.

## Gotchas

- Client modules import schema files directly, such as `./schemas/version`, rather than the `./schemas` barrel, so tree-shakable entries stay narrow.
- Auth and configuration use storage from the default entry point through `web-storage.ts`. Resolve stores with `getLocalStorage()` or `getSessionStorage()`; they return `null` when unusable. Even a resolved store can throw on writes, so mutate through `setStorageItem()`, `removeStorageItem()`, or `clearStorage()`.
- Browser CSS is plain CSS, without Tailwind or preprocessors. Its public specifier stays `@youversion/platform-core/browser/styles/*`.

## Guardrails

- Keep the default entry point runtime-agnostic and React-free. Browser-specific code exports from `/browser`; server-specific code exports from `/server`. Storage uses the capability-checked helpers above.
- Define input/output types with Zod schemas and validate API responses before returning them.

## Endpoints and clients

Endpoint, client, schema, or environment-specific export changes: read `docs/adding-a-core-endpoint.md` at the repo root.

## Passage display

Passage display model or rendering-resource changes: read `docs/passage-display-api.md` at the repo root.

## Public API

Export changes: inspect `src/index.ts`, `src/browser.ts`, `src/server.ts`, and the `exports` map in this package's `package.json`.

## Testing

Testing or coverage: read `docs/testing.md` at the repo root for package ownership and dependency-aware commands.
