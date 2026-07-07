import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionProvider } from './YouVersionProvider';
import { YouVersionContext } from './YouVersionContext';

function ContextReader() {
  const ctx = useContext(YouVersionContext);
  return <div data-testid="installation-id">{ctx?.installationId ?? 'none'}</div>;
}

describe('YouVersionProvider', () => {
  beforeEach(() => {
    YouVersionPlatformConfiguration.installationId = null;
  });

  it('provides a non-null installationId via context', () => {
    render(
      <YouVersionProvider appKey="test">
        <ContextReader />
      </YouVersionProvider>,
    );

    const id = screen.getByTestId('installation-id').textContent;
    expect(id).toBeTruthy();
    expect(id).not.toBe('none');
  });

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])('throws when appKey is %s', (_label, appKey) => {
    expect(() =>
      render(
        // @ts-expect-error -- exercising the runtime guard with an invalid appKey
        <YouVersionProvider appKey={appKey}>
          <ContextReader />
        </YouVersionProvider>,
      ),
    ).toThrow(/non-empty "appKey" is required/);
  });
});
