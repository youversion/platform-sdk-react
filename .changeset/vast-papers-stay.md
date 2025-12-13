---
'@youversion/platform-react-ui': patch
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
---

Add dark mode to the Verse of the Day component and use provider theme

- add dark mode css to the verse of the day component
- utilize the theme on the provider to infer the background color if one
is not provided on components.
