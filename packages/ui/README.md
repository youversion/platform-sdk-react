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

Optional `locale` sets bundled UI copy (Verse of the Day heading, buttons, etc.) and `Accept-Language` instead of following the browser language. Regional tags like `es-MX` resolve to a bundled locale. This is app language, not Bible translation language — seed the version picker with `defaultLanguageId` on `BibleReader.Root`.

```tsx
<YouVersionProvider appKey="YOUR_APP_KEY" locale="es">
  <VerseOfTheDay />
</YouVersionProvider>
```

### Limit which Bible versions the SDK uses

By default the version picker offers Bible versions in every available language. Limit that with `permittedLanguageTags`, `permittedVersionIds`, and `excludedVersionIds` on `YouVersionProvider`. A version must satisfy every list that is set. Exclusion wins if an id is in both permit and exclude lists. Unset means no restriction; an empty permit list permits nothing.

```tsx
<YouVersionProvider
  appKey="YOUR_APP_KEY"
  permittedLanguageTags={['en']}
  permittedVersionIds={[111, 3034]}
  excludedVersionIds={[4212]}
>
  <BibleCard reference="JHN.3.16" versionId={3034} showVersionPicker />
</YouVersionProvider>
```

Language tags are BCP 47 (`en`, `es`, `zh-Hans`). Version ids are YouVersion Bible version ids. An unusable id is refused everywhere — lists, picker, and `versionId` on reader/card/text/VOTD — and surfaces the existing forbidden error. Core-only hosts can set the same lists on `YouVersionPlatformConfiguration`.

## Styling

All component CSS is automatically injected when you wrap your app with `YouVersionProvider` — no extra imports or build steps needed. Under the hood, it uses React 19's [`<style precedence>`](https://react.dev/reference/react-dom/components/style) to hoist styles into `<head>` with built-in deduplication and SSR/Suspense support.

The YPE-5356 component boundary renders automatically inside client-created open
shadow roots. This includes `YouVersionAuthButton`, the chapter and version picker
roots, `BibleReader.Root`, and standalone `BibleThemeSettingsContent`,
`BibleTextView`, `FootnoteContent`, `VerseOfTheDay`, `BibleCard`, `ProfileAvatar`,
and `Separator`. Compound members and SDK-owned composed children reuse their
owning root instead of creating accidental nested roots.

`Textarea`, standalone `VerseActionPopover`, `YouVersionProvider`, and
`BaseYouVersionProvider` do not create automatic roots. `Textarea` must retain
native outer-form and external-label behavior; standalone `VerseActionPopover`
must retain its owning-DOM anchor; and the providers own document context, styles,
and fonts rather than a visual component boundary. See the
[rollout policy](../../docs/shadow-dom-rollout-policy.md) and
[consumer compatibility contract](../../docs/shadow-dom-consumer-compatibility.md)
for the complete boundary and evidence.

### Shadow DOM migration guidance

Automatic isolation is a breaking rendered-DOM change even when component props
are unchanged:

- **Client rendering and refs:** Server output is a childless light-DOM host whose
  inline `display` declares the boundary's intended layout. Content and forwarded
  element refs become available after the passive-effect client mount, so there
  can be visible pop-in or nearby layout movement and no component content without
  JavaScript.
- **DOM access and automation:** Document queries do not cross the boundary. Wait
  for the host's open `shadowRoot`, then query within it, or prefer public refs,
  callbacks, and role-based locators. Playwright CSS locators pierce open roots by
  default; XPath does not. Internal markup is not a stable public API. Arbitrary
  `BibleReader.Root` children and consumer-supplied picker triggers move into the
  owning root, so document queries no longer find them there.
- **Events:** Native composed events observed outside the root are retargeted to
  the host. React callbacks passed to a component retain their documented target
  semantics. Light-DOM ancestor React handlers receive one delivery for the
  validated bubbling `click`, `keydown`, `keyup`, `pointerdown`, `pointerup`,
  `mousedown`, `mouseup`, `dblclick`, `contextmenu`, `focus`, `blur`, and native
  `input` paths. The host corrects duplicate React `onInput` delivery; React
  `onChange` was already delivered once because the outer event is retargeted to
  the non-form host. Capture handlers and unlisted composed bubbling families can
  still receive duplicate delivery. YPE-6210 covers `onClickCapture`; focused
  Chromium probes observed duplicate move, wheel, keypress, drag-start, and copy
  delivery. This list is representative, not exhaustive.
- **Forms and accessibility relationships:** Native outer forms, external
  `<label for>`, and cross-tree `aria-labelledby` or `aria-describedby` references
  do not cross a shadow boundary. Keep related nodes in one tree or use an
  explicit component prop or callback.
- **Styling and layout:** Consumer global CSS and document-level token overrides
  cannot style shadow internals. Use supported component props and theme inputs.
  Fonts remain document-owned, `rem` units still follow the owning document root,
  and `direction` is intentionally inherited. Ancestor geometry can size, clip,
  or transform the light-DOM host, but the internal reset can restore
  `visibility` and `pointer-events`. To hide an isolated component, apply
  `display: none` to a consumer-owned light-DOM wrapper or do not render the
  component. To disable one, use a supported component API instead of ancestor
  `pointer-events`.
- **Overlays:** Popovers and dialogs stay in their owning root and use the native
  top layer where needed. Opening a peer popover dismisses the current peer;
  simultaneous peer popovers are not supported. The native Popover API is
  required for isolated floating content; there is no clipped inline fallback,
  and opening an overlay throws when the API is unavailable. Without a consumer
  error boundary, that error can unmount the affected React root. Do not combine
  an automatically isolated `BibleTextView` with a consumer-rendered
  `VerseActionPopover`: the verses and popover would be in different DOM trees,
  so their anchor relationship is unsupported. Use `BibleReader` for the
  supported verse-selection and verse-action flow. In any other standalone
  `VerseActionPopover` integration, the popover and its anchor must remain in the
  same DOM tree.

**Non-React or manual CSS import:**

```tsx
import '@youversion/platform-react-ui/styles.css';
```

All component classes are prefixed with `yv:` to avoid collisions with your app's styles. For light-DOM components, override design tokens with CSS variables on `[data-yv-sdk]` (see [Custom CSS variables](#custom-css-variables)). Document selectors cannot reach automatically isolated component internals.

### Content Security Policy

The SDK emits inline `<style>` elements and inline style attributes for component
CSS and runtime layout, including the declarative `display` on automatic shadow
hosts. The simplest supported policy permits inline style elements and attributes
in addition to allowlisting the font origins. For CSP Level 3, merge equivalent
directives into your application's policy:

```
style-src-elem 'unsafe-inline' https://fonts.googleapis.com https://api.youversion.com;
style-src-attr 'unsafe-inline';
font-src https://fonts.gstatic.com https://cdn.youversion.com;
```

The SDK does not currently expose a CSP nonce. Applications that prohibit
`'unsafe-inline'` must maintain matching hashes for embedded style elements and
server-rendered style attributes (using `'unsafe-hashes'` for attributes);
nonce-only policies are not currently supported.

- `fonts.googleapis.com` / `fonts.gstatic.com` — Inter and Source Serif 4 (base typography), loaded from Google Fonts
- `api.youversion.com` — the Fonts API stylesheet (`/v1/fonts/1/stylesheet`), which `YouVersionProvider` requests with your app key
- `cdn.youversion.com` — the Untitled Serif woff2 files that stylesheet points at

Untitled Serif is YouVersion's brand serif and the SDK's default serif face. There is no prop to turn it off. If the Fonts API or CDN is blocked, serif text falls back to Source Serif 4 when Google Fonts is available; if Google Fonts is also blocked, it falls back to the browser's generic serif face. The stack is `'Untitled Serif', 'Source Serif 4', serif`. If you load Untitled Serif yourself, your copy is used; the stack names it first regardless of who fetched it.

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

These document-level overrides apply to light-DOM components, not to automatically isolated component internals. The package does not expose a public shadow-root token override API.

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
