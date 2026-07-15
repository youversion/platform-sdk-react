---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Tag the `X-YVP-Sdk` header with a `-dev` suffix for non-published builds so platform telemetry can separate internal YouVersion dev-time traffic from published partner traffic.

Published builds report the real version (`ReactSDK=2.2.0`); builds from source, dev, or tests report `ReactSDK=2.2.0-dev`. The version is stamped at build time via `YVP_PUBLISH_BUILD` (set by each package's `prepublishOnly`), and a publish guard aborts the release if an unstamped `-dev` build would ship. Published header values are otherwise unchanged, and consumers can still override `X-YVP-Sdk` via `additionalHeaders`.
