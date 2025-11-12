# @youversion/platform-react-ui

React SDK for YouVersion Platform (web).

## Installation

```bash
pnpm add @youversion/platform-react-ui
# or
npm install @youversion/platform-react-ui
# or
yarn add @youversion/platform-react-ui
```

## Quick Start

### Import the styles

For the components to be styled, import the CSS once at the app’s global entry.

- Next.js App Router: import in your app root (for example, [examples/nextjs/src/app/layout.tsx](examples/nextjs/src/app/layout.tsx:1))
  ```ts
  // app/layout.tsx
  import '@youversion/platform-react-ui/styles.css';
  ```
- Vite/SPA: import it once in your main entry file (e.g., main.tsx) or a global stylesheet that is imported there:
  ```ts
  // main.tsx
  import '@youversion/platform-react-ui/styles.css';
  ```

### Add the Providers

Wrap your app with the required providers. YVPProvider handles authentication, while BibleSDKProvider enables Bible-related components like BibleTextView.

```tsx
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';

function App() {
  return (
    <BibleSDKProvider appId="your-app-id">
      <YVPProvider config={{ appId: 'your-app-id'}}>
        <YourApp />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

## Theming

The React SDK’s theme is fully scoped to its own wrapper to avoid conflicts with host apps and ShadCN UI variables.

- Dark and light modes are controlled via the theme prop on [YVPProvider()](packages/ui/src/providers/YVPProvider.tsx:32)
- CSS variables are defined under the SDK wrapper only, preventing collisions with app-level variables

Basic usage (set dark or light):

```tsx
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

export default function App() {
  return (
    <BibleSDKProvider appId="YOUR_APP_ID">
      <YVPProvider
        config={{ appId: 'YOUR_APP_ID'}}
        theme="dark"  // 'light' | 'dark' (default is 'light')
      >
        <YourApp />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

Toggle theme at runtime:

```tsx
import { useState } from 'react';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';
import '@youversion/platform-react-ui/styles.css';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <BibleSDKProvider appId="YOUR_APP_ID">
      <YVPProvider
        config={{ appId: 'YOUR_APP_ID' }}
        theme={theme}
      >
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Toggle theme
        </button>
        <YourApp />
      </YVPProvider>
    </BibleSDKProvider>
  );
}
```

## Customizing Styles

The React SDK uses scoped CSS variables prefixed with `--yv-` to avoid conflicts with your app's styles. You can override these variables to customize colors, fonts, and Bible reader appearance.

### Overriding CSS Variables

Add custom styles after importing `@youversion/platform-react-ui/styles.css`:

```css
[data-yv-sdk] {
  /* Override theme colors */
  --yv-primary: #your-color;
  --yv-background: #your-bg-color;

  /* Override Bible reader styles */
  --yv-reader-font-size: 18px;
  --yv-reader-line-height: 1.5;
  --yv-font-family: 'Your Font', serif;
}
```

### Key Customizable Variables

#### Theme Colors
- `--yv-background`, `--yv-foreground`: Main background and text colors
- `--yv-primary`, `--yv-primary-foreground`: Primary button colors
- `--yv-secondary`, `--yv-secondary-foreground`: Secondary colors
- `--yv-muted`, `--yv-muted-foreground`: Muted text colors
- `--yv-accent`, `--yv-accent-foreground`: Accent colors
- `--yv-destructive`, `--yv-destructive-foreground`: Error/destructive colors

#### Bible Reader
- `--yv-font-family`: Font stack for Bible text (defaults to Inter and Source Serif Pro)
- `--yv-reader-font-size`: Font size for verses (default: 20px)
- `--yv-reader-line-height`: Line height for verses (default: 1.625)
- `--yv-red`, `--yv-red-dark-mode`: Color for words of Jesus

#### Color Palettes
The SDK includes predefined palettes (teal, blue, purple, etc.) that can be overridden or used in your components via Tailwind classes like `yv:text-teal-30`.

## Components

### SignInButton

```tsx
import { SignInButton } from '@youversion/platform-react-ui';

export default function Page() {
  return (
    <main className="flex flex-col items-center gap-4">
      <SignInButton />
    </main>
  );
}
```

### Verse

The Verse component provides sub-components for rendering Bible verses.

#### Verse.Text

Renders a single verse with superscript number and text.

```tsx
import { Verse } from '@youversion/platform-react-ui';

export default function Page() {
  return (
    <Verse.Text number={16} text="For God so loved the world..." size="lg" />
  );
}
```

Props:
- `number`: The verse number.
- `text`: The verse text.
- `size`: Optional size variant ('default' | 'lg', default: 'default').

#### Verse.Html

Renders HTML content for Bible verses with optional styling.

```tsx
import { Verse } from '@youversion/platform-react-ui';

export default function Page() {
  return (
    <Verse.Html html="<p>Verse content</p>" fontFamily="serif" fontSize={20} lineHeight={1.5} />
  );
}
```

Props:
- `html`: The HTML content of the verse(s).
- `fontFamily`: Optional font family for the text.
- `fontSize`: Optional font size in pixels.
- `lineHeight`: Optional line height.

### BibleTextView

Renders Bible verses or passages from the YouVersion API. Requires the app to be wrapped with `BibleSDKProvider`.

```tsx
import { BibleTextView } from '@youversion/platform-react-ui';

export default function Page() {
  return (
    <BibleTextView
      reference="JHN.3.16"
      versionId={1}
      fontFamily="serif"
      fontSize={20}
      lineHeight={1.5}
    />
  );
}
```

Props:
- `reference`: The Bible reference (e.g., "JHN.3.16" for John 3:16).
- `versionId`: The Bible version ID (e.g., 1 for KJV).
- `fontFamily`: Optional font family for the text.
- `fontSize`: Optional font size in pixels.
- `lineHeight`: Optional line height.

## Hooks

### useAuthentication

Provides the auth state and actions (sign in/out, fetch profile). See implementation in [/src/hooks/useAuthentication.ts](./src/hooks/useAuthentication.ts).

```tsx
import { useAuthentication } from '@youversion/platform-react-ui';

export function AuthControls() {
  const { isAuthenticated, isLoading, signIn, signOut, fetchUserInfo } = useAuthentication();

  if (isLoading) return <p>Loading…</p>;

  return isAuthenticated ? (
    <div className="flex items-center gap-2">
      <button onClick={() => fetchUserInfo()} className="rounded-md px-4 py-2 bg-secondary text-secondary-foreground">
        Fetch profile
      </button>
      <button onClick={() => signOut()} className="rounded-md px-4 py-2 bg-destructive text-white">
        Sign out
      </button>
    </div>
  ) : (
    <button onClick={() => signIn()} className="rounded-md px-4 py-2 bg-primary text-primary-foreground">
      Sign in with YouVersion
    </button>
  );
}
```


## Development

### Project Structure

```
packages/ui/
├── .storybook/          # Storybook configuration
├── src/
│   ├── components/      # UI components (SignInButton, etc.)
│   ├── hooks/           # React hooks (useAuthentication)
│   ├── lib/             # Utility functions
│   ├── providers/       # YVPProvider and context
│   ├── styles/          # Global styles and CSS
│   └── test/            # Test utilities
├── scripts/             # Build scripts
├── chromatic.config.json # Chromatic visual regression config
└── package.json
```

### Storybook

Storybook is used for component development and documentation.

**Environment Setup:**

Copy the `.env.example` file into a `.env.local` file in `packages/ui/` with the following environment variables for Storybook to work properly:

```bash
# Required for Storybook components that interact with YouVersion API
STORYBOOK_YOUVERSION_APP_ID="your-app-id"

# Optional: Required for Chromatic visual regression testing
CHROMATIC_PROJECT_TOKEN="your-chromatic-token"
```

**Start Storybook:**
```bash
pnpm storybook
```

**Build Storybook:**
```bash
pnpm build-storybook
```

### Visual Testing with Chromatic

Chromatic provides visual regression testing for Storybook components.

**Run Chromatic:**
```bash
pnpm chromatic
```

This command:
- Uses `dotenv` to load `.env.local`
- Requires `CHROMATIC_PROJECT_TOKEN` in `.env.local` (see Storybook section above)
- Runs visual regression tests on component stories
- Only tests changed components (see [chromatic.config.json](chromatic.config.json))

### Commands

See [package.json](package.json) for all available scripts:
- `pnpm build` - Build all outputs (CSS, JS, types)
- `pnpm dev` - Watch mode for development
- `pnpm test` - Run Vitest tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm typecheck` - Type check without emitting
- `pnpm lint` - Run ESLint

## Troubleshooting

- Styles not applied:
  - Ensure you imported `@youversion/platform-react-ui/styles.css` at your app's global entry (e.g., [examples/nextjs/src/app/layout.tsx](../../examples/nextjs/src/app/layout.tsx)).
  - Do not import the CSS from inside component modules.
- Next.js error “Global CSS cannot be imported from within node_modules”:
  - Move the import to your root layout (App Router)
- Storybook components not working:
  - Ensure `STORYBOOK_YOUVERSION_APP_ID` is  set in `.env.local`
  - Components will use fallback demo values if environment variables are not set
- Chromatic not running:
  - Ensure `CHROMATIC_PROJECT_TOKEN` is set in `.env.local`

## License

License is TBD.
