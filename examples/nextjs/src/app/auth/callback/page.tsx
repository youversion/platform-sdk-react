'use client';

import { type JSX } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WebAuthenticationStrategy } from '@youversion/platform-react-ui';

export default function AuthCallbackPage(): JSX.Element {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Let the WebAuthenticationStrategy handle the callback
      // This stores the callback URL in sessionStorage for the signIn flow to process
      const isCallback = WebAuthenticationStrategy.handleCallback();

      if (isCallback) {
        // The PKCE flow will handle token exchange in Users.signIn()
        // Just redirect back to home - the auth state will update automatically
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        setError('Invalid callback - missing required parameters');
        setTimeout(() => router.push('/'), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTimeout(() => router.push('/'), 2000);
    } finally {
      setIsProcessing(false);
    }
  }, [router]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Completing sign in...</h2>
          <p className="text-gray-600">Please wait while we process your authentication.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting back to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-green-600">Processing authentication...</h2>
        <p className="text-sm text-gray-500">Redirecting back to home...</p>
      </div>
    </div>
  );
}
