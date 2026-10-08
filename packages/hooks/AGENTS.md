# @youversion/platform-react-hooks

React data hooks and providers backed by `@youversion/platform-core` clients.

Keep this file brief. Put task-specific guidance behind a pointer.

## Gotchas

- Keep contexts and providers in separate files; export contexts through `src/context/index.ts`.
- Choose the `YouVersionContext.hookOverrides` posture at mount and keep it unchanged for that instance. Data hooks still call their inner hooks and skip fetches with `enabled: !override`.

## Guardrails

- Delegate HTTP and auth storage to core clients and storage abstractions. Keep hooks UI-agnostic, without JSX returns or direct DOM manipulation; this package must not depend on UI.
- Keep TanStack Query types and the `QueryClient` private. The public read contract stays `{ data, loading, error, refetch }`.
- Account-scoped hooks include `useUserScope()` in their key and pass `keepPreviousData: false`. If the scope is `null`, disable the query so unidentified accounts cannot share data.

## Data fetching

Data hook, query-key, cache, or refetch changes: read `docs/adr/0006-tanstack-query-read-layer.md` at the repo root. New data hooks use `useApiData`; the ADR describes the batch exception.

## Public API and usage

Export changes: inspect `src/index.ts`. Hook signatures: read each hook's props type. Provider usage: read `examples/vite-react` at the repo root.

## Testing

Testing or coverage: read `docs/testing.md` at the repo root for package ownership, provider factories, and dependency-aware commands.
