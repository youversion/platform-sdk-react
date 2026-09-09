# Theme

Demo chrome dark/light/system toggle. It drives `ThemeProvider` (`storageKey="yv-sdk-demo-theme"`) and is passed into `YouVersionProvider` as `theme`, so SDK surfaces (`data-yv-theme`) follow the page.

## Sub-features

- Toggle control (sun/moon icons, accessible name **Toggle theme**)
- Menu: **Light**, **Dark**, **System**
- `document.documentElement` class `dark` when dark
- Persistence in `localStorage['yv-sdk-demo-theme']`

## How to get to it (user POV)

The control is always in the header, right of Sign in / Sign out, on every page.

## Driving it with Playwright

```bash
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs theme
```

1. Screenshot current theme.
2. Click **Toggle theme** → **Dark**.
3. Wait for `document.documentElement.classList.contains('dark')`.
4. Assert `localStorage.getItem('yv-sdk-demo-theme') === 'dark'`.
5. Screenshot (`02-dark.png`).

Also check a page that shares the provider: after Dark, click **Bible Card** or **Verse of the Day** and confirm `[data-yv-theme="dark"]` on an SDK `section`.

**End state that proves it:** `html` has class `dark`, storage is `dark`, and at least one `[data-yv-sdk][data-yv-theme="dark"]` node is present.

## Gotchas

- Origin-scoped storage. A run on port 5177 does not see a human’s 5173 theme.
- System follows `prefers-color-scheme`. In headless Chrome that is usually light unless you emulate `colorScheme: 'dark'`.
- Missing-app-key panel still honors `theme` on `YouVersionProvider`, but the demo navbar (including this toggle) is **not** rendered in that state.
