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

  it('syncs the version filter props onto the platform config, and only re-syncs when a list really changes', () => {
    YouVersionPlatformConfiguration.permittedVersionIds = undefined;
    YouVersionPlatformConfiguration.excludedVersionIds = undefined;
    YouVersionPlatformConfiguration.permittedLanguageTags = undefined;

    const { rerender } = render(
      <YouVersionProvider
        appKey="test"
        permittedVersionIds={[111, 3034]}
        excludedVersionIds={[206]}
        permittedLanguageTags={['en']}
      >
        <ContextReader />
      </YouVersionProvider>,
    );

    expect(YouVersionPlatformConfiguration.permittedVersionIds).toEqual([111, 3034]);
    expect(YouVersionPlatformConfiguration.excludedVersionIds).toEqual([206]);
    expect(YouVersionPlatformConfiguration.permittedLanguageTags).toEqual(['en']);

    // A re-render with fresh-but-equal array literals must not re-run the sync
    // effect. Overwrite the static first: if the effect re-runs, the sentinel
    // is clobbered.
    YouVersionPlatformConfiguration.permittedVersionIds = [999];
    rerender(
      <YouVersionProvider
        appKey="test"
        permittedVersionIds={[3034, 111]}
        excludedVersionIds={[206]}
        permittedLanguageTags={['en']}
      >
        <ContextReader />
      </YouVersionProvider>,
    );
    expect(YouVersionPlatformConfiguration.permittedVersionIds).toEqual([999]);

    // A changed list does sync, and dropping a prop returns that filter to
    // unrestricted rather than leaving the previous value in place.
    rerender(
      <YouVersionProvider appKey="test" permittedVersionIds={[111]}>
        <ContextReader />
      </YouVersionProvider>,
    );
    expect(YouVersionPlatformConfiguration.permittedVersionIds).toEqual([111]);
    expect(YouVersionPlatformConfiguration.excludedVersionIds).toBeUndefined();
    expect(YouVersionPlatformConfiguration.permittedLanguageTags).toBeUndefined();
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
