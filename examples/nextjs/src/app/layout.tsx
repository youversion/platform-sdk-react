import { Providers } from './providers';
import React, { type JSX } from 'react';
import './globals.css';

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
  // For static export, use a default redirect URI
  // In a real deployment, this would be configured as an environment variable
  const redirectUri =
    process.env.NEXT_PUBLIC_REDIRECT_URI ?? 'https://your-app.vercel.app/auth/callback';

  return (
    <html lang="en">
      <body className="w-full p-6">
        <Providers redirectUri={redirectUri}>{children}</Providers>
      </body>
    </html>
  );
}
