import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('uses an explicit installationId prop when provided', async () => {
    render(
      <YouVersionProvider appKey="test" installationId="custom-id">
        <ContextReader />
      </YouVersionProvider>,
    );

    await waitFor(() => {
      expect(YouVersionPlatformConfiguration.installationId).toBe('custom-id');
    });
    expect(screen.getByTestId('installation-id').textContent).toBe('custom-id');
  });

  it('falls back to a generated id when no prop is provided', () => {
    render(
      <YouVersionProvider appKey="test">
        <ContextReader />
      </YouVersionProvider>,
    );

    const id = screen.getByTestId('installation-id').textContent;
    expect(id).toBeTruthy();
    expect(id).not.toBe('none');
  });
});
