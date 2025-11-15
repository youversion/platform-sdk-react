import { Providers } from './providers';
import React, { type JSX } from 'react';
import './globals.css';
import '@youversion/platform-react-ui/styles.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  // For local development, use port 6006 (root path - backend configured)
  // In a real deployment, this would be configured as an environment variable
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI ?? 'http://localhost:6006';

  return (
    <html lang="en">
      <body className="w-full p-6">
        <Providers redirectUri={redirectUri}>{children}</Providers>
      </body>
    </html>
  );
}
