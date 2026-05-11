// React SDK main entry point

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
  YouVersionProvider as BaseYouVersionProvider,
  useYVAuth,
  type UseYVAuthReturn,
} from '@youversion/platform-react-hooks';

export { YouVersionProvider } from './components/YouVersionProvider';
