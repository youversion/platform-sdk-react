'use client';

import { useAuthentication, type YouVersionUserInfo } from '@youversion/platform-react-ui';
import { useState, useEffect, type JSX } from 'react';

function AuthenticatedUserInfo({
  userInfo,
  isLoading,
}: {
  userInfo: YouVersionUserInfo | null;
  isLoading: boolean;
}): JSX.Element | null {
  if (isLoading) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg max-w-md">
        <p className="text-sm text-blue-600">Loading user info...</p>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div className="bg-green-50 p-4 rounded-lg max-w-md text-black">
      <h3 className="font-semibold text-green-800 mb-2">User Information</h3>
      <p className="text-sm">
        <strong>Name:</strong>{' '}
        {userInfo.firstName && userInfo.lastName
          ? `${userInfo.firstName} ${userInfo.lastName}`
          : userInfo.firstName || userInfo.lastName || 'N/A'}
      </p>
      <p className="text-sm">
        <strong>User ID:</strong> {userInfo.userId || 'N/A'}
      </p>
      {userInfo.avatarUrl && (
        <p className="text-sm">
          <strong>Avatar:</strong>{' '}
          <img
            src={userInfo.avatarUrl.toString()}
            alt="User Avatar"
            className="inline-block w-8 h-8 rounded-full ml-2"
          />
        </p>
      )}
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

export default function UserInfoCard(): JSX.Element | null {
  const { auth, fetchUserInfo } = useAuthentication();
  const [userInfo, setUserInfo] = useState<YouVersionUserInfo | null>(null);
  const [userInfoLoading, setUserInfoLoading] = useState(false);

  useEffect(() => {
    const loadUserInfo = async () => {
      if (auth.isAuthenticated) {
        setUserInfoLoading(true);
        try {
          const info = await fetchUserInfo();
          setUserInfo(info);
        } catch {
          // On error, clear any stale user info
          setUserInfo(null);
        } finally {
          setUserInfoLoading(false);
        }
      } else {
        setUserInfo(null);
      }
    };

    void loadUserInfo();
  }, [auth.isAuthenticated, fetchUserInfo]);

  if (!auth.isAuthenticated) {
    return <UnauthenticatedUserInfo />;
  }

  return <AuthenticatedUserInfo userInfo={userInfo} isLoading={userInfoLoading} />;
}
