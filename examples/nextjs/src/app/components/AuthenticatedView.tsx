'use client';

import { type JSX } from 'react';
import { useAuthentication } from '@youversion/platform-react-ui';
import UserInfoCard from './UserInfoCard';

export default function AuthenticatedView(): JSX.Element {
  const { signOut } = useAuthentication();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="text-center space-y-4 text-black">
      <p className="text-green-600 font-semibold">✓ Authenticated</p>
      <UserInfoCard />
      <button
        onClick={handleSignOut}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Sign Out
      </button>
    </div>
  );
}
