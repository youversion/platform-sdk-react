# Adding an endpoint or client to `packages/core`

Read this when adding or changing a YouVersion API endpoint, creating a new
`*Client` class in `packages/core`, or wiring Zod schemas for a new
request/response shape.

Core is schema-first and React-free. Zod schemas are the single source of truth
for every input and output type.

## Steps

1. **Define types** in `src/schemas/` using Zod — one schema for the request
   payload, one for the response.
2. **Extend or add a client.** Prefer extending an existing client (for example
   `BibleClient`) when the endpoint logically belongs there. Otherwise create
   `src/xyz.ts` with a new `XyzClient` that composes `YouVersionAPI`.
3. **Wire validation.** Parse the API response with its Zod schema. Throw or
   return typed errors on validation failure — never return an unvalidated
   response.
4. **Export from the public API** in `src/index.ts` so consumers can import the
   client and its types.
5. **Add tests.** Unit tests with MSW for mocked responses. Integration tests are
   optional and guarded by `INTEGRATION_TESTS=true`.

## Constraints

- `YouVersionAPI` owns base URL, headers, and auth tokens. Every client extends
  or composes it, so HTTP behavior stays consistent.
- HTTP goes through native `fetch`. Do not add an HTTP library.
- No React, `window`, `document`, or browser storage in the default entry point.
  Browser-only code exports from `/browser`; server-only code exports from
  `/server`.

## Environment-specific entry points

Core has three entry points, and the split is deliberate — it keeps the main
export runtime-agnostic while `linkedom` stays out of browser bundles:

| Entry point | Behavior |
|---|---|
| `@youversion/platform-core` | Runtime-agnostic; requires DOM adapters |
| `@youversion/platform-core/browser` | Convenience wrapper using native `DOMParser` |
| `@youversion/platform-core/server` | Convenience wrapper using `linkedom` |

If a new client needs DOM access, follow the same pattern rather than importing
a DOM library into the main entry point.
