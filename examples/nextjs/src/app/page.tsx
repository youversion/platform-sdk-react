'use client';

import { type JSX } from 'react';
import { useAuthentication } from '@youversion/platform-react-ui';
import AuthenticatedView from './components/AuthenticatedView';
import UnauthenticatedView from './components/UnauthenticatedView';

export default function Home(): JSX.Element {
  const { auth } = useAuthentication();

  if (auth.isLoading) {
    return (
      <main className="w-full flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <p className="text-gray-600">Please wait while we process your authentication.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full flex flex-col items-start justify-start min-h-screen gap-4">
      <h1 className="text-4xl font-bold">YouVersion SDK Demo</h1>
      {auth.isAuthenticated ? <AuthenticatedView /> : <UnauthenticatedView />}
    </main>
  );
}
