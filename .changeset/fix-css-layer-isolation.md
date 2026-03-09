---
"@youversion/platform-core": minor
"@youversion/platform-react-hooks": minor
"@youversion/platform-react-ui": minor
---

Fix SDK styles overriding consumer app CSS by wrapping all styles in custom @layer directives (yv-sdk-*). Declares Tailwind v4's standard layer names (theme, base, components, utilities) before SDK layers to establish cascade priority: consumer Tailwind layers < SDK layers < consumer unlayered CSS. This prevents SDK resets and utilities from bleeding into consumer apps while protecting SDK components from consumer Tailwind styles.

Fixed a styling bug in the BibleReader.Toolbar when the user is signed in, so that the avatar button is circular versus oblong.

Fixed the BibleReader.Toolbar's popover button for sign in and sign out to respect dark/light modes.
