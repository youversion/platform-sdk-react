'use client';

import { useAuthentication } from '@youversion/platform-react-ui';
import type { JSX } from 'react';
import UnauthenticatedView from './UnauthenticatedView';

function AuthenticatedUserInfo({
  name,
  yvpUserId,
  email,
  profilePicture,
  permissions,
}: {
  name?: string;
  yvpUserId: string;
  email?: string;
  profilePicture?: string;
  permissions?: string[];
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
      <p className="text-sm">
        <strong>Permissions:</strong> {permissions?.length ? permissions.join(', ') : 'None'}
      </p>
    </div>
  );
}

function UnauthenticatedUserInfo() {
  return (
    <div className="bg-gray-50 p-4 rounded-lg max-w-md">
      <p className="text-sm text-gray-600">Not signed in</p>
    </div>
  );
}

export default function UserInfoCard(): JSX.Element {
  const { auth } = useAuthentication();
  console.log({ auth });

  if (!auth.result) {
    return <UnauthenticatedView />;
  }

  return (
    <AuthenticatedUserInfo
      name={auth.result.name}
      yvpUserId={auth.result.yvpUserId || ''}
      email={auth.result.email}
      profilePicture={auth.result.profilePicture}
      permissions={auth.result.permissions}
    />
  );
}
