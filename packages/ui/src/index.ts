// React SDK main entry point

import { injectStyles } from './lib/inject-styles';

// Inject styles on import
injectStyles();

export * from './components';
export * from './hooks';
export * from './providers';
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

export { BibleSDKProvider } from '@youversion/platform-react-hooks';
