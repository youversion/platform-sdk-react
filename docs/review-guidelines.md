## Review Guidelines

When conducting code reviews, AI agents should systematically evaluate the following aspects:

### Code Standards and Conventions
- Do the changes follow the established conventions and patterns used throughout the codebase?
- Is the code style consistent with existing code (indentation, naming conventions, file organization)?
- Are the appropriate design patterns being used where applicable?
- Does the code follow the monorepo structure and package boundaries?
- Are TypeScript types properly defined and avoiding `any` types?

### Security Assessment
- Do the changes introduce any security vulnerabilities or risks?
- Are user inputs properly validated and sanitized?
- Is sensitive data properly handled and protected?
- Are authentication and authorization checks properly implemented?
- Are there any exposed API keys, credentials, or sensitive configuration data?
- Are network requests using appropriate security protocols (HTTPS, proper headers)?
- Is XSS protection properly implemented (no dangerouslySetInnerHTML without sanitization)?
- Are Content Security Policy considerations met?

### Performance Considerations
- Do the changes introduce potential performance bottlenecks?
- Are there any inefficient algorithms or data structures being used?
- Is there unnecessary re-rendering or state updates in React components?
- Are React hooks (useMemo, useCallback, memo) used appropriately to prevent unnecessary renders?
- Are large lists properly virtualized where appropriate?
- Is lazy loading implemented for heavy resources and code splitting used effectively?
- Are bundle sizes kept reasonable (check with build output)?
- Is tree-shaking working properly for unused exports?
- Are web vitals (LCP, FID, CLS) maintained or improved?

### React/TypeScript Best Practices
- Are components properly optimized using React.memo, useMemo, and useCallback where appropriate?
- Is component composition preferred over prop drilling?
- Are custom hooks following the Rules of Hooks?
- Is proper error boundary implementation in place?
- Are TypeScript generics used effectively for reusable components?
- Is strict mode TypeScript being followed (no implicit any, proper null checking)?
- Are discriminated unions used for complex state management?
- Are React 18+ features (Suspense, concurrent features) used appropriately?

### Package Architecture
- Does the code respect package boundaries (core → hooks → ui dependency order)?
- Are internal APIs properly exported through package index files?
- Is the unified versioning strategy maintained?
- Are workspace dependencies correctly referenced?
- Does the code follow the established build order requirements?

### Functional Verification
- Does the code actually implement what the PR description claims?
- Are all acceptance criteria from the related issue/ticket met?
- Are edge cases properly handled?
- Is error handling comprehensive and user-friendly?
- Are all promised features fully implemented and working?
- Do changes work across all supported browsers?

### Testing and Documentation
- Are appropriate tests included for new functionality (using Vitest)?
- Do tests follow the *.test.ts(x) naming pattern?
- Do existing tests still pass?
- Is the code self-documenting with clear variable and function names?
- Are complex logic sections properly commented?
- Are API changes documented with proper TypeScript JSDoc?
- Are breaking changes clearly identified in changesets?
- Is test coverage maintained or improved?

### Dependencies and Compatibility
- Are new dependencies necessary and well-maintained?
- Do new dependencies have appropriate TypeScript types?
- Are version requirements appropriate and following semver?
- Is backward compatibility maintained where expected?
- Are deprecated APIs avoided?
- Are peer dependencies properly defined for the published packages?
- Is the minimum Node.js version (>= 22.13.0) respected?

### Build System and Tooling
- Do changes work with the Turbo build cache?
- Are tsup configurations properly maintained?
- Does API Extractor successfully generate type definitions?
- Do lint and format commands pass successfully?
- Are pre-commit hooks passing?
- Are changeset entries created for user-facing changes?

### Accessibility
- Are ARIA attributes properly implemented?
- Is keyboard navigation fully supported?
- Are focus states clearly visible?
- Do interactive elements have appropriate roles?
- Are form inputs properly labeled?
- Is color contrast WCAG compliant?
- Are screen reader announcements appropriate?

### User Experience
- Do the changes provide a smooth and intuitive user experience?
- Are loading states and error states properly handled?
- Is feedback provided for user actions?
- Are animations performant and purposeful (respecting prefers-reduced-motion)?
- Is responsive design maintained across viewport sizes?
- Are browser-specific quirks handled appropriately?

### Developer Experience
- Is the API intuitive and consistent with existing patterns?
- Are TypeScript types providing good IDE support and autocomplete?
- Are error messages helpful and actionable?
- Is the component API well-designed and flexible?
- Are props properly documented with JSDoc comments?
- Are examples provided for complex usage patterns?
