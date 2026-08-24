/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { useVersionFilterWarning } from './use-version-filter-warning';

describe('useVersionFilterWarning', () => {
  it('warns once in development when the host asked for an unusable version id', () => {
    YouVersionPlatformConfiguration.excludedVersionIds = [424242];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const first = renderHook(() => useVersionFilterWarning(424242));
    const second = renderHook(() => useVersionFilterWarning(424242));
    renderHook(() => useVersionFilterWarning(206));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/versionId 424242/);

    first.unmount();
    second.unmount();
    warn.mockRestore();
    YouVersionPlatformConfiguration.excludedVersionIds = undefined;
  });
});
