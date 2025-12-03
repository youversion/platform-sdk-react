# TypeScript Typecheck Errors in Hooks Package

## Unique Error Types

### Mock Function Errors
- [x] TS2339: Property 'mockResolvedValue' does not exist on mocked functions
  - `signInWithYouVersion` mock (lines 154, 175, 193, 210)
  - `refreshAuthToken` mock (lines 232, 252, 272)
- [x] TS2339: Property 'mockReturnValue' does not exist on mocked functions
  - `getYouVersionUserInfoFromIdToken` mock (lines 155, 233)
- [x] TS2339: Property 'mockRejectedValue' does not exist on mocked functions
  - `signInWithYouVersion` mock (line 193)
  - `refreshAuthToken` mock (line 252)
  - `redirectToYouVersionAuth` mock (line 148)

### Read-only Property Assignment Errors
- [ ] TS2540: Cannot assign to read-only properties in auth store
  - `idToken` (lines 156, 211, 231, 271, 82)
  - `refreshToken` (lines 230, 251, 270, 83)
  - `accessToken` (lines 81, 231)

### Type Mismatch Errors
- [ ] TS2353: Object literal may only specify known properties
  - 'installationId' does not exist in type 'AuthConfig' (lines 39, 40 in different test files)
- [ ] TS2739: Type missing required properties
  - YouVersionUserInfo missing 'getAvatarUrl' and 'avatarUrl' properties (line 283)

## Files Affected
- `src/context/YouVersionAuthProvider.test.tsx`
- `src/useYVAuth.test.tsx`

## Summary
- **Total errors**: 29
- **Unique error types**: 5
- **Files affected**: 2 test files

## Next Steps
1. Fix mock function type issues (likely need proper jest type definitions or vi.fn() types)
2. Update test data to match current AuthConfig interface (remove installationId)
3. Make auth store properties mutable for tests or use proper test utilities
4. Ensure YouVersionUserInfo objects include all required properties