---
'@youversion/platform-core': minor
'@youversion/platform-react-hooks': minor
'@youversion/platform-react-ui': minor
---

Replace module-level injectStyles() side effect with React 19 style precedence hoisting via YouVersionProvider. Styles are now injected once at the provider level instead of per-component. Add static CSS export at @youversion/platform-react-ui/styles.css for non-React consumers.
