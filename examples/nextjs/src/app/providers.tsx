'use client';

import { type JSX } from 'react';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';

interface ProvidersProps {
  children: React.ReactNode;
  redirectUri: string;
}

export function Providers({ children, redirectUri }: ProvidersProps): JSX.Element {
  // Use fallback values for static export/build compatibility
  const appId = process.env.NEXT_PUBLIC_YVP_APP_ID ?? 'demo-app-id';

  return (
    <YVPProvider
      config={{
        appId,
        redirectUri: redirectUri,
      }}
    >
      <BibleSDKProvider appId={appId}>{children}</BibleSDKProvider>
    </YVPProvider>
  );
}
