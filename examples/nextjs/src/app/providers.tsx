'use client';

import { type JSX } from 'react';
import { BibleSDKProvider, YVAuthProvider } from '@youversion/platform-react-ui';

interface ProvidersProps {
  children: React.ReactNode;
  redirectUri: string;
}

export function Providers({ children, redirectUri }: ProvidersProps): JSX.Element {
  // Use fallback values for static export/build compatibility
  const appKey = process.env.NEXT_PUBLIC_YVP_APP_KEY ?? 'demo-app-key';
  const apiHost = process.env.NEXT_PUBLIC_YVP_API_HOST ?? 'api-test.youversion.com';

  return (
    <YVAuthProvider
      config={{
        appKey,
        redirectUri: redirectUri,
        apiHost: apiHost,
      }}
    >
      <BibleSDKProvider apiHost={apiHost} appKey={appKey}>
        {children}
      </BibleSDKProvider>
    </YVAuthProvider>
  );
}
