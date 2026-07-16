---
'@youversion/platform-react-ui': minor
---

Add `ProfileAvatar` component with initials fallback (YPE-3648). Signed-in users without a profile image now see their initials ("Cam Anderson" → "CA", "Cher" → "C") in a bordered circle instead of a broken avatar; loaded photos get a 3px gray ring per design. `BibleReader`'s user menu now uses `ProfileAvatar` for all authenticated states, and the component is exported for direct use.
