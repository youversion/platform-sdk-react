---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Add `X-YVP-Sdk` header to every API call and let consumers override headers

- New `X-YVP-Sdk: ReactSDK={version}` header sent on every request alongside `X-YVP-App-Key`. The version is imported directly from `packages/core/package.json` and inlined by the bundler at build time.
- `SDK_VERSION`, `SDK_NAME`, and `SDK_VERSION_HEADER_NAME` exported from `@youversion/platform-core`.
- `ApiConfig` gains an optional `additionalHeaders` map that is merged into every request. Keys here override the SDK's built-in headers, so wrappers (e.g. the React Native Expo SDK) can replace `X-YVP-Sdk` with their own identifier.
- `YouVersionProvider` gains an `additionalHeaders` prop that flows through context to every hook-built `ApiClient`.
