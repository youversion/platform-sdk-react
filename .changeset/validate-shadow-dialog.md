---
'@youversion/platform-react-ui': patch
---

Keep shadow-local top-layer dialogs focus-contained and their background inert
while mounted. Restore focus to the original opener after dismissal, including
close/reopen during exit, while ignoring disconnected targets and targets moved
outside their captured root.
