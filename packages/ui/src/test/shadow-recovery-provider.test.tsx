import { YouVersionContext } from '@youversion/platform-react-hooks';
import { render } from '@testing-library/react';
import { useContext } from 'react';
import { expect, it } from 'vitest';
import { ShadowRecoveryStoryProvider } from './shadow-recovery-provider';

it('keeps the recovery context stable when its inputs do not change', () => {
  const values: unknown[] = [];
  const parentValue = { apiHost: 'parent.invalid', appKey: 'parent-key' };
  const Observer = () => {
    values.push(useContext(YouVersionContext));
    return null;
  };
  const view = render(
    <YouVersionContext.Provider value={parentValue}>
      <ShadowRecoveryStoryProvider apiHost="recovery.invalid">
        <Observer />
      </ShadowRecoveryStoryProvider>
    </YouVersionContext.Provider>,
  );
  const firstValue = values.at(-1);

  view.rerender(
    <YouVersionContext.Provider value={parentValue}>
      <ShadowRecoveryStoryProvider apiHost="recovery.invalid">
        <Observer />
      </ShadowRecoveryStoryProvider>
    </YouVersionContext.Provider>,
  );

  expect(values.at(-1)).toBe(firstValue);
});
