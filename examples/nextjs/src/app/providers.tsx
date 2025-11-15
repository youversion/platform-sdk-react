'use client';

import { type JSX } from 'react';
import { BibleSDKProvider, YVPProvider } from '@youversion/platform-react-ui';

interface ProvidersProps {
  children: React.ReactNode;
  redirectUri: string;
}

export function Providers({ children, redirectUri }: ProvidersProps): JSX.Element {
  // Use fallback values for static export/build compatibility
  const appKey = process.env.NEXT_PUBLIC_YVP_APP_KEY ?? 'demo-app-key';

  return (
    <YVPProvider
      config={{
        appKey,
        redirectUri: redirectUri,
      }}
    >
      <BibleSDKProvider appKey={appKey}>{children}</BibleSDKProvider>
    </YVPProvider>
  );
}
