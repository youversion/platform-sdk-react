![License](https://img.shields.io/badge/license-Apache%202.0-blue)

# @youversion/platform-react-ui

Pre-built React components for Bible applications with styling included.

## When to use this package

Use `@youversion/platform-react-ui` when you need:
- ✅ Production-ready Bible components for your React app
- ✅ Pre-styled components with light/dark mode
- ✅ Minimal setup: wrap your app with providers and use the components
- ✅ Consistent, accessible UI out of the box
Get your App Key at [platform.youversion.com](https://platform.youversion.com/)

**Use other packages instead if you:**
- ❌ Need low-level API access → Use [@youversion/platform-core](../core/README.md)
- ❌ Want custom UI → Use [@youversion/platform-react-hooks](../hooks/README.md)

## Install

```bash
pnpm add @youversion/platform-react-ui
```

Get your App Key at [platform.youversion.com](https://platform.youversion.com/)

## Usage

Wrap your app with the provider and use components:

```tsx
import { YouVersionProvider, BibleTextView } from '@youversion/platform-react-ui';

function App() {
  return (
    <YouVersionProvider appKey={"YOUR_APP_KEY"}>
      <BibleTextView reference="JHN.1.1-4" versionId={3034} />
    </YouVersionProvider>
  );
}
```

## Styling

All component CSS is automatically injected when you wrap your app with `YouVersionProvider` — no extra imports or build steps needed. Under the hood, it uses React 19's [`<style precedence>`](https://react.dev/reference/react-dom/components/style) to hoist styles into `<head>` with built-in deduplication and SSR/Suspense support.

**Non-React or manual CSS import:**

```tsx
import '@youversion/platform-react-ui/styles.css';
```

All component classes are prefixed with `yv:` to avoid collisions with your app's styles.

### Your CSS and our CSS

**Our styles stay inside our components. Your styles stay outside them.**

Every SDK rule applies only to elements marked `data-yv-sdk`. The components add
that attribute themselves, so no rule in the SDK stylesheet can reach your
markup. In the other direction, your global CSS no longer changes ours. A reset
such as `* { box-sizing: content-box }`, or a rule such as
`button { padding: 1rem }`, changed the appearance of our components before. It
does not change them now.

Read these four points before you upgrade:

- **You cannot style SDK internals, and we never supported it.** If you target
  our elements from your stylesheet, our rule overrides yours. Class names,
  `data-slot` values and DOM structure are internal. They change without a major
  version.
- **`!important` no longer overrides our rules, and neither does an id.** The
  SDK stylesheet ships in a cascade layer named `yv`, and its declarations carry
  `!important`. For important declarations the cascade reverses layer order and
  ranks unlayered CSS last, so `button { padding: 2rem !important }` in your
  global CSS no longer changes our buttons. `#app button { padding: 1rem }` does
  not either — importance is sorted above specificity.
- **A short list of properties is still yours to change.** We leave `position`,
  `top`/`left`/`right`/`bottom`, `z-index`, `transform`, `opacity`,
  `animation-*`, `transition-*`, `font-size`, `background-color`, `border-*` and
  every `--*` custom property out of the layer, because our popovers and
  animations set them at runtime. The
  [residual-leak report](https://github.com/youversion/platform-sdk-react/blob/main/docs/style-isolation-residual-leak.md)
  has the full list and the reason for each one.
- **Your root font size no longer scales our components.** A page with
  `html { font-size: 62.5% }` used to shrink every SDK size by 37.5 percent. Our
  stylesheet now ships `px` instead of `rem`, and our root declares
  `font-size: 16px`. Browser zoom still works. If you want our components to
  scale with your type size, set `[data-yv-sdk] { font-size: … }` — that
  property is one of the ones we leave to you.

To change the appearance of the components, use a supported path:

- **Design tokens.** Set `--yv-*` variables on `[data-yv-sdk]`. See
  [Custom CSS variables](#custom-css-variables).
- **Theme.** Use the `theme` prop on `YouVersionProvider`, or the `background`
  prop on an individual component. See [Theming](#theming).
- **Ask us.** If the tokens do not cover what you need,
  [open an issue](https://github.com/youversion/platform-sdk-react/issues).

For the full rationale, read
[ADR-0005](https://github.com/youversion/platform-sdk-react/blob/main/docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md)
,
[ADR-0006](https://github.com/youversion/platform-sdk-react/blob/main/docs/adr/0006-layer-and-importantize-the-sdk-sheet.md)
and
[ADR-0007](https://github.com/youversion/platform-sdk-react/blob/main/docs/adr/0007-convert-rem-to-px-in-the-sdk-sheet.md).

### Content Security Policy

The SDK loads webfonts from external origins. If your app sets a strict `Content-Security-Policy`, allowlist these hosts so fonts aren't blocked (without them, components fall back to a system sans-serif):

```
font-src  https://fonts.gstatic.com https://cdn.youversion.com;
style-src https://fonts.googleapis.com https://api.youversion.com;
```

- `fonts.googleapis.com` / `fonts.gstatic.com` — Inter and Source Serif 4 (base typography), loaded from Google Fonts
- `api.youversion.com` — the Fonts API stylesheet (`/v1/fonts/1/stylesheet`), which `YouVersionProvider` requests with your app key
- `cdn.youversion.com` — the Untitled Serif woff2 files that stylesheet points at

Untitled Serif is YouVersion's brand serif and the SDK's default serif face. There is no prop to turn it off. If these hosts are blocked, serif text falls back to Source Serif 4 with no layout break — the stack is `'Untitled Serif', 'Source Serif 4', serif`. If you load Untitled Serif yourself, your copy is used; the stack names it first regardless of who fetched it.

## Theming

Set the theme via the `YouVersionProvider`'s `theme` prop. Defaults to `'light'`.

```tsx
import { YouVersionProvider, BibleTextView } from '@youversion/platform-react-ui';

function App() {
  return (
    <YouVersionProvider appKey="YOUR_APP_KEY" theme="dark">
      <BibleTextView reference="JHN.1.1-4" versionId={3034} />
    </YouVersionProvider>
  );
}
```

### Theme options

| Value | Behavior |
|-------|----------|
| `'light'` | Light mode (default) |
| `'dark'` | Dark mode |
| `'system'` | Follows the user's OS preference via `prefers-color-scheme` |

### Following OS theme

Pass `theme="system"` to automatically match the user's OS setting:

```tsx
<YouVersionProvider appKey="YOUR_APP_KEY" theme="system">
  {/* Components switch between light/dark based on OS preference */}
</YouVersionProvider>
```

### Toggling theme manually

```tsx
import { useState } from 'react';
import { YouVersionProvider, BibleTextView } from '@youversion/platform-react-ui';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <YouVersionProvider appKey="YOUR_APP_KEY" theme={theme}>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle theme
      </button>
      <BibleTextView reference="JHN.1.1-4" versionId={3034} />
    </YouVersionProvider>
  );
}
```

### Per-component overrides

Individual components accept a `background` prop to override the provider theme locally:

```tsx
<YouVersionProvider appKey="YOUR_APP_KEY" theme="light">
  {/* This component uses dark styling despite the provider being light */}
  <BibleReader.Root background="dark" versionId={3034}>
    <BibleReader.Content />
  </BibleReader.Root>
</YouVersionProvider>
```

### Custom CSS variables

```css
[data-yv-sdk] {
  --yv-primary: #your-primary-color;
  --yv-background: #your-background-color;
  --yv-reader-font-size: 18px;
}
```

## Documentation and API Reference
* [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## License

This SDK is licensed under [Apache 2.0](./LICENSE). 

Licensing information for the Bible versions is available 
at the [YouVersion Platform](https://platform.youversion.com/) site.
