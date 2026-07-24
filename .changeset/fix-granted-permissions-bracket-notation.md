---
'@youversion/platform-core': patch
---

Fix one-shot sign-in dropping the `highlights` grant when the auth server echoes it back with PHP/Rails bracket-array notation (`granted_permissions[]=highlights`).

`parseGrantedPermissions` read only the bare `granted_permissions` key, but `URLSearchParams` treats `granted_permissions[]` (and indexed `granted_permissions[0]`) as distinct keys. The server demonstrably uses this bracket notation for the analogous outbound `requested_permissions[]` param it builds on the hosted consent redirect, so a return echo in the same shape was silently discarded — leaving the permission cache empty and re-prompting the just-in-time data-exchange consent after a completed sign-in. The parser now accepts `granted_permissions`, `granted_permissions[]`, and `granted_permissions[<index>]`, keeping it symmetric with the server's encoding. Purely additive: bare `granted_permissions` and all user/state-scoping and fail-closed protections are unchanged.
