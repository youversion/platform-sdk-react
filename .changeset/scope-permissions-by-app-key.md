---
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
'@youversion/platform-react-ui': patch
---

Scope cached grants and pending data-exchange state by app key as well as user, keep the auth hook's access token current after callbacks and refreshes, and preserve server-accepted highlight overlays across provider remounts while read replicas converge.
