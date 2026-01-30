'use client';

import { YouVersionAuthButton } from '@youversion/platform-react-ui';

export function AuthButton() {
  return (
    <div className="flex items-center gap-4">
      <YouVersionAuthButton
        onAuthError={(e) => console.error('Auth error:', e)}
        variant="outline"
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      />
    </div>
  );
}
