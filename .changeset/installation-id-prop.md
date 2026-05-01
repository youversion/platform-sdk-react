---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Add optional `installationId` prop to `YouVersionProvider` and tolerate runtimes without `crypto.randomUUID` (such as Expo DOM components). When the consumer passes an `installationId` (via `<YouVersionProvider installationId="..." />`, `YouVersionPlatformConfiguration.installationId = ...`, or `new ApiClient({ installationId, ... })`), it is used directly. Otherwise the SDK uses `crypto.randomUUID()` when available, falling back to a non-secure timestamp+random id when it is not.
