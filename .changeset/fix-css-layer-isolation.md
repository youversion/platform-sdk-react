---
"@youversion/platform-core": patch
"@youversion/platform-react-hooks": patch
"@youversion/platform-react-ui": patch
---

Fix SDK styles overriding consumer app CSS by wrapping all styles in custom @layer directives (yv-sdk-*). Declares Tailwind v4's standard layer names (theme, base, components, utilities) before SDK layers to establish cascade priority: consumer Tailwind layers < SDK layers < consumer unlayered CSS. This prevents SDK resets and utilities from bleeding into consumer apps while protecting SDK components from consumer Tailwind styles.
