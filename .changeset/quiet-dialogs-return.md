---
'@youversion/platform-react-ui': patch
---

Fix focus restoration for opt-in Shadow DOM dialogs by preserving the original opener across a close/reopen during exit, while ignoring disconnected targets and targets moved out of their captured root.
