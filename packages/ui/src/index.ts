// React SDK main entry point

import { injectStyles } from './lib/inject-styles';

// Inject styles on import
injectStyles();

export * from './components';
export * from './types';

// Re-export shared types and API classes
export {
  SignInWithYouVersionPermission,
  SignInWithYouVersionResult,
  YouVersionAPIUsers,

  // Authentication
  type ApiConfig,
  type AuthenticationState,
} from '@youversion/platform-core';

export {
  YouVersionProvider,
  useYVAuth,
  YouVersionAuthProvider,
  type UseYVAuthReturn,
} from '@youversion/platform-react-hooks';
