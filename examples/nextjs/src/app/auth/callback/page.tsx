'use client';

import { type JSX } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WebAuthenticationStrategy } from '@youversion/platform-react-ui';
import { SignInWithYouVersionResult } from '@youversion/platform-react-ui';

export default function AuthCallbackPage(): JSX.Element {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [result, setResult] = useState<SignInWithYouVersionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Store the original callback URL before WebAuthenticationStrategy cleans it up
      const originalCallbackUrl = new URL(window.location.href);

      // Let the WebAuthenticationStrategy handle the callback storage
      // This should happen BEFORE we redirect back to home
      const isCallback = WebAuthenticationStrategy.handleCallback();

      if (isCallback) {
        // Use the original URL that still has the parameters
        const authResult = new SignInWithYouVersionResult(originalCallbackUrl);
        setResult(authResult);

        // Short delay to show the result, then redirect
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError('Invalid callback URL');
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
        <h2 className="text-2xl font-bold mb-4 text-green-600">Sign In Successful!</h2>
        {result && (
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p className="text-sm mb-2">
              <strong>Status:</strong> {result.accessToken ? 'Authenticated' : 'Failed'}
            </p>
            {result.yvpUserId && (
              <p className="text-sm mb-2">
                <strong>User ID:</strong> {result.yvpUserId}
              </p>
            )}
            {result.permissions.length > 0 && (
              <p className="text-sm mb-2">
                <strong>Permissions:</strong> {result.permissions.join(', ')}
              </p>
            )}
            {result.accessToken && (
              <p className="text-xs text-gray-600">
                <strong>Access Token:</strong> {result.accessToken.substring(0, 20)}...
              </p>
            )}
          </div>
        )}
        <p className="text-sm text-gray-500">Redirecting back to home...</p>
      </div>
    </div>
  );
}
