![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)
![React >= 19.0.0](https://img.shields.io/badge/React-%3E%3D%2019.0.0-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

# @youversion/platform-react-ui

Pre-built React components for building Bible-based applications with the YouVersion Platform SDK. Get styled, production-ready components that work seamlessly with Bible content.

## Overview

`@youversion/platform-react-ui` provides ready-to-use React components for Bible-focused applications. Features include pre-styled components with theming support, light and dark mode out of the box, scoped CSS to prevent conflicts, and accessibility-first design.

This package depends on [@youversion/platform-react-hooks](../hooks/README.md) and [@youversion/platform-core](../core/README.md).

> **📚 Full Documentation:** [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)

## Installation

```bash
pnpm add @youversion/platform-react-ui
```

### Peer Dependencies

Requires React 19.0.0 or higher:

```bash
pnpm install react@19.0.0
```

### Prerequisites

- YouVersion Platform App Key ([Get from platform.youversion.com](https://platform.youversion.com/))

## When to Use This Package

Use `@youversion/platform-react-ui` when you need:
- ✅ Production-ready Bible components for your React app
- ✅ Pre-styled components with light/dark mode
- ✅ Minimal setup—wrap your app with providers and use components
- ✅ Consistent, accessible UI out of the box

**Use other packages instead if:**
- ❌ Need low-level API access → Use [@youversion/platform-core](../core/README.md)
- ❌ Want custom UI → Use [@youversion/platform-react-hooks](../hooks/README.md)

## Related Packages

- **[@youversion/platform-core](../core/README.md)** - Low-level TypeScript SDK for direct API access
- **[@youversion/platform-react-hooks](../hooks/README.md)** - React hooks for declarative data fetching

## Setup

Import styles and wrap your app with required providers:

```tsx
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: "YOUR_APP_KEY" }}>
        {/* All components work here */}
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

> **⚠️ Missing Provider Error:** If components don't render correctly, check that both `BibleSDKProvider` and `YVPProvider` wrap your component tree.

## Quick Start

**Next.js App Router:**

```tsx
// app/layout.tsx
import '@youversion/platform-react-ui/styles.css';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BibleSDKProvider appKey={process.env.NEXT_PUBLIC_APP_KEY!}>
          <YVPProvider config={{ appKey: process.env.NEXT_PUBLIC_APP_KEY! }}>
            {children}
          </YVPProvider>
        </BibleSDKProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import { VerseOfTheDay } from '@youversion/platform-react-ui';

export default function Home() {
  return <VerseOfTheDay versionId={111} />;
}
```

## Features

- Ready-to-use UI components for Bible content
- Light and dark mode toggling
- CSS variable overrides for customization
- Verse display with proper formatting
- Bible version and chapter selection
- Full TypeScript support
- Accessibility features

## Theming

Toggle theme via the `YVPProvider`:

```tsx
import { useState } from 'react';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: "YOUR_APP_KEY" }} theme={theme}>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Toggle theme
        </button>
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

Customize via CSS variables:

```css
[data-yv-sdk] {
  --yv-primary: #your-primary-color;
  --yv-background: #your-background-color;
  --yv-reader-font-size: 18px;
}
```

## Troubleshooting

### Styles Not Applied

**Solution:** Ensure you imported `@youversion/platform-react-ui/styles.css` at your app's root entry point (e.g., `app/layout.tsx` for Next.js).

### Next.js Error: "Global CSS cannot be imported from within node_modules"

**Solution:** Move the import to your root layout file:

```tsx
// app/layout.tsx
import '@youversion/platform-react-ui/styles.css';
```

## Development

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development instructions including Storybook setup.

## License

See [LICENSE](../../LICENSE)

## Support

- GitHub Issues: [Create an issue](https://github.com/youversion/platform-sdk-react/issues)
- Platform Docs: [platform.youversion.com](https://platform.youversion.com/)
- React Hooks: [@youversion/platform-react-hooks](../hooks/README.md)
- Core SDK: [@youversion/platform-core](../core/README.md)
- Monorepo: [YouVersion Platform SDK](../../README.md)
