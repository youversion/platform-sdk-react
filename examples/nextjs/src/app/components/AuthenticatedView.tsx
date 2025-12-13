'use client';

import { type JSX } from 'react';
import { YouVersionAuthButton } from '@youversion/platform-react-ui';
import UserInfoCard from './UserInfoCard';

export default function AuthenticatedView(): JSX.Element {
  const redirectUrl = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:6006';

  const handleError = (error: Error) => {
    console.error('Authentication error:', error);
  };

  return (
    <div className="text-center space-y-4 text-black">
      <p className="text-green-600 font-semibold">✓ Authenticated</p>
      <UserInfoCard />
      <YouVersionAuthButton redirectUrl={redirectUrl} onAuthError={handleError} />
    </div>
  );
}
