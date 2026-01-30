import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouVersion Bible Reader',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-screen w-screen">
      <body className="h-full w-full m-0 p-0">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
