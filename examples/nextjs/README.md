# YouVersion Platform React SDK - Next.js Example

This is a [Next.js](https://nextjs.org) example application demonstrating integration with the [YouVersion Platform React SDK](../../README.md).

## What This Example Demonstrates

This example showcases:
- Integration of `@youversion/platform-react-ui` components
- Setup of the `YouVersionProvider`
- Basic Bible content display and interaction

## Packages Used

This example uses:

- **[@youversion/platform-react-ui](../../packages/ui/README.md)** - Pre-built React components for Bible features
- **[@youversion/platform-core](../../packages/core/README.md)** - Type-safe API client (used internally by UI components)
- **[Next.js](https://nextjs.org)** - React framework for production

## Setup & Configuration

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your [YouVersion Platform](https://platform.youversion.com/) credentials:

```
NEXT_PUBLIC_YVP_APP_KEY=your_APP_KEY_here
```

### 3. Run the Example

From the monorepo root:

```bash
pnpm dev:web
```

Or from this directory:

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Modifying for Your App

To use this example as a starting point:

1. **Update App Key** in `.env.local` with your YouVersion Platform app credentials
2. **Import components** from `@youversion/platform-react-ui` in your pages
3. **Wrap your app** with required providers (see `app/layout.tsx`)
4. **Customize components** and styling as needed

## Key Files

- `app/layout.tsx` - Provider setup and layout
- `app/page.tsx` - Main page with example components
- `.env.example` - Environment variable template

## Learn More

- [YouVersion Platform React SDK](../../README.md) - SDK overview and architecture
- [React UI Package](../../packages/ui/README.md) - Component documentation
- [React Hooks Package](../../packages/hooks/README.md) - Custom hook documentation
- [Core Package](../../packages/core/README.md) - API client documentation
- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [YouVersion Platform Docs](https://developers.youversion.com/) - Platform API reference
