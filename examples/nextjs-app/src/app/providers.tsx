'use client';

import { YouVersionProvider } from '@youversion/platform-react-ui';

export function Providers({ children }: { children: React.ReactNode }) {
  const appKey = process.env.NEXT_PUBLIC_YVP_APP_KEY || 'demo-key';
  const redirectUrl = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/callback';

  return (
    <YouVersionProvider appKey={appKey} includeAuth={true} authRedirectUrl={redirectUrl}>
      {children}
    </YouVersionProvider>
  );
}
