---
'@youversion/platform-react-hooks': minor
'@youversion/platform-core': minor
'@youversion/platform-react-ui': minor
---

Summary:
Add sign-out functionality and refactor authentication system. This includes:

- New sign-out capability on the authentication button
- Refactored authentication flow with improved token refresh
- Renamed context providers (BibleSDKContext/Provider → YouVersionContext/Provider, YVAuthContext/Provider → YouVersionAuthContext/Provider)
- Enhanced test coverage with extracted reusable mocks
- Breaking changes to authentication APIs and provider names

Breaking changes:

- Provider and context names have changed
- Authentication flow APIs have been modified
- Button component now includes sign-out functionality
