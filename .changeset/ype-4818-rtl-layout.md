---
'@youversion/platform-core': minor
'@youversion/platform-react-ui': minor
---

Complete RTL support across Bible UI surfaces and pickers. SDK chrome now resolves Interface direction from an explicit provider override or the SDK UI locale, emits real `dir` boundaries and portals, mirrors semantic geometry and directional controls, and isolates mixed-direction API strings. Scripture surfaces independently resolve `scriptureDirection` from an explicit override, transformed YVDOM, or `auto`, including footnotes. RTL highlight swatch overflow fades use visible geometry instead of browser-specific scroll offsets.
