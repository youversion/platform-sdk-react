import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionProvider } from './YouVersionProvider';
import { YouVersionContext } from './YouVersionContext';

function FilterReader() {
  return (
    <div data-testid="filters">
      {YouVersionPlatformConfiguration.permittedVersionIds?.join(',') ?? 'none'}
    </div>
  );
}

function ContextReader() {
  const ctx = useContext(YouVersionContext);
  return <div data-testid="installation-id">{ctx?.installationId ?? 'none'}</div>;
}

describe('YouVersionProvider', () => {
  beforeEach(() => {
    YouVersionPlatformConfiguration.installationId = null;
    YouVersionPlatformConfiguration.permittedVersionIds = undefined;
    YouVersionPlatformConfiguration.excludedVersionIds = undefined;
    YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
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

  it('writes version filters during render so the first child read sees them', () => {
    YouVersionPlatformConfiguration.permittedVersionIds = undefined;

    render(
      <YouVersionProvider appKey="test" permittedVersionIds={[111, 3034]}>
        <FilterReader />
      </YouVersionProvider>,
    );

    expect(screen.getByTestId('filters').textContent).toBe('111,3034');
    expect(YouVersionPlatformConfiguration.permittedVersionIds).toEqual([111, 3034]);
  });
});
