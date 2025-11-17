![License](https://img.shields.io/badge/license-Apache%202.0-blue)

# @youversion/platform-react-ui

Pre-built React components for Bible applications with styling included.

## Install

```bash
pnpm add @youversion/platform-react-ui
```

Get your App Key at [platform.youversion.com](https://platform.youversion.com/)

## Usage

Import styles and wrap your app:

```tsx
import { BibleSDKProvider, YVPProvider, VerseOfTheDay } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

function App() {
  return (
    <BibleSDKProvider appKey="YOUR_APP_KEY">
      <YVPProvider config={{ appKey: "YOUR_APP_KEY" }}>
        <VerseOfTheDay versionId={111} />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

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

---

**API Reference:** [developers.youversion.com/sdks/react](https://developers.youversion.com/sdks/react)
