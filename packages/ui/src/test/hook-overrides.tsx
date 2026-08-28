import { YouVersionContext, type HookOverrides } from '@youversion/platform-react-hooks';
import { TestQueryClientProvider } from '@youversion/platform-react-hooks/test-utils';
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

export { TestQueryClientProvider };

export function HookOverrideProvider({
  overrides,
  theme = 'light',
  children,
}: {
  overrides?: HookOverrides;
  theme?: 'light' | 'dark';
  children: ReactNode;
}): ReactElement {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test', theme, hookOverrides: overrides }}>
      <TestQueryClientProvider>{children}</TestQueryClientProvider>
    </YouVersionContext.Provider>
  );
}

export function renderWithHookOverrides(
  ui: ReactElement,
  overrides?: HookOverrides,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => (
      <HookOverrideProvider overrides={overrides}>{children}</HookOverrideProvider>
    ),
  });
}
