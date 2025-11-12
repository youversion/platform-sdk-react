'use client';

import { type JSX } from 'react';
import { useAuthentication } from '@youversion/platform-react-ui';
import UserInfoCard from './UserInfoCard';

export default function AuthenticatedView(): JSX.Element {
  const { auth, signOut } = useAuthentication();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="text-center space-y-4 text-black">
      <p className="text-green-600 font-semibold">✓ Authenticated</p>
      {auth.result && (
        <div className="bg-gray-100 p-4 rounded-lg max-w-md">
          <p className="text-sm">
            <strong>User ID:</strong> {auth.result.yvpUserId}
          </p>
          <p className="text-sm">
            <strong>Permissions:</strong> {auth.result.permissions.join(', ')}
          </p>
        </div>
      )}

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
