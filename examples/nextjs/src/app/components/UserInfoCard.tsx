'use client';

import { useYVAuth } from '@youversion/platform-react-ui';
import type { JSX } from 'react';
import UnauthenticatedView from './UnauthenticatedView';

function AuthenticatedUserInfo({
  name,
  yvpUserId,
  email,
  profilePicture,
}: {
  name?: string;
  yvpUserId: string;
  email?: string;
  profilePicture?: string;
}): JSX.Element {
  return (
    <div className="bg-green-50 p-4 rounded-lg max-w-md text-black">
      <h3 className="font-semibold text-green-800 mb-2">User Information (from JWT)</h3>
      <p className="text-sm">
        <strong>Name:</strong> {name || 'N/A'}
      </p>
      <p className="text-sm">
        <strong>User ID:</strong> {yvpUserId}
      </p>
      <p className="text-sm">
        <strong>Email:</strong> {email || 'N/A'}
      </p>
      {profilePicture && (
        <p className="text-sm">
          <strong>Avatar:</strong>{' '}
          <img
            src={profilePicture}
            alt="User Avatar"
            className="inline-block w-8 h-8 rounded-full ml-2"
          />
        </p>
      )}
    </div>
  );
}

export default function UserInfoCard(): JSX.Element {
  const { auth, userInfo } = useYVAuth();

  if (!auth.isAuthenticated || !userInfo) {
    return <UnauthenticatedView />;
  }

  return (
    <AuthenticatedUserInfo
      name={userInfo.name}
      yvpUserId={userInfo.userId || ''}
      email={userInfo.email}
      profilePicture={userInfo.avatarUrl?.toString()}
    />
  );
}
