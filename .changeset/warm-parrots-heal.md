---
'@youversion/platform-react-hooks': minor
'@youversion/platform-core': minor
'@youversion/platform-react-ui': minor
---

🔄 Authentication System Overhaul

- Replaced old authentication strategy with new PKCE-based OAuth flow
- Removed AuthenticationStrategy.ts and WebAuthenticationStrategy.ts
- Added SignInWithYouVersionPKCE.ts for secure OAuth implementation
- Enhanced Users.ts with comprehensive auth token management (+469 lines)

🏗️ Context/Provider Architecture Refactor

- Renamed BibleSDKContext/Provider → YouVersionContext/Provider
- Removed UI-level YVPProvider, YVPErrorBoundary
- Added dedicated auth providers: YouVersionAuthProvider and YouVersionAuthContext
- Consolidated authentication logic into hooks package

🪝 New Hooks Implementation

- Added useYVAuth hook for authentication state management
- Updated existing hooks (useBibleClient, useHighlights, etc.) to use new context
- Enhanced configuration management in YouVersionPlatformConfiguration

🔧 Infrastructure Improvements

- Added token refresh capabilities
- Improved memory leak prevention in auth provider
- Enhanced type definitions and exports

Applications using this SDK will need to:

1. Update all context/provider imports and names
2. Migrate from old authentication patterns to new PKCE flow
3. Update provider setup in application roots
4. Adjust any direct usage of removed authentication classes
5. Update package imports for auth-related functionality
