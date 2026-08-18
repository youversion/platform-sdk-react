import { describe, it, expect, beforeEach, onTestFinished } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { useContext, useEffect } from 'react';
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

  it('syncs the version filter props onto the platform config before a child can fetch, and follows the props after', () => {
    onTestFinished(() => {
      YouVersionPlatformConfiguration.permittedVersionIds = undefined;
      YouVersionPlatformConfiguration.excludedVersionIds = undefined;
      YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
    });
    YouVersionPlatformConfiguration.permittedVersionIds = undefined;
    YouVersionPlatformConfiguration.excludedVersionIds = undefined;
    YouVersionPlatformConfiguration.permittedLanguageTags = undefined;

    // Core's list clients read these while *building* a request, and a child
    // fetches from its own effect — which React runs before the provider's.
    // Record what a child sees at that moment: if the provider synced in an
    // effect, this would be undefined and the first fetch of a fresh mount
    // would build against an unset config.
    let seenByChildEffect: number[] | undefined;
    function FetchingChild(): React.ReactElement {
      useEffect(() => {
        seenByChildEffect = YouVersionPlatformConfiguration.permittedVersionIds;
      }, []);
      return <ContextReader />;
    }

    const { rerender } = render(
      <YouVersionProvider
        appKey="test"
        permittedVersionIds={[111, 3034]}
        excludedVersionIds={[206]}
        permittedLanguageTags={['en']}
      >
        <FetchingChild />
      </YouVersionProvider>,
    );

    expect(seenByChildEffect).toEqual([111, 3034]);
    expect(YouVersionPlatformConfiguration.permittedVersionIds).toEqual([111, 3034]);
    expect(YouVersionPlatformConfiguration.excludedVersionIds).toEqual([206]);
    expect(YouVersionPlatformConfiguration.permittedLanguageTags).toEqual(['en']);

    // A changed list syncs, and dropping a prop returns that filter to
    // unrestricted rather than leaving the previous value in place.
    rerender(
      <YouVersionProvider appKey="test" permittedVersionIds={[111]}>
        <FetchingChild />
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
