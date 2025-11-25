// React SDK main entry point

// Import processed styles for injection
import '../dist/tailwind.css';

export * from './components';
export * from './hooks';
export * from './providers';
export * from './types';

// Re-export shared types
export {
  SignInWithYouVersionPermission,
  SignInWithYouVersionResult,

  // Authentication
  WebAuthenticationStrategy,
  type ApiConfig,
  type AuthenticationState,
} from '@youversion/platform-core';

export { BibleSDKProvider } from '@youversion/platform-react-hooks';
