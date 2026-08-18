/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { resetVersionFilterWarnings, useVersionFilterWarning } from './use-version-filter-warning';

/** Ready-to-run subject: clean ledger, clean filters, a spied `console.warn`. */
function setup(filters: {
  permittedVersionIds?: number[];
  excludedVersionIds?: number[];
  permittedLanguageTags?: string[];
}) {
  resetVersionFilterWarnings();
  YouVersionPlatformConfiguration.permittedVersionIds = filters.permittedVersionIds;
  YouVersionPlatformConfiguration.excludedVersionIds = filters.excludedVersionIds;
  YouVersionPlatformConfiguration.permittedLanguageTags = filters.permittedLanguageTags;

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const cleanup = () => {
    warn.mockRestore();
    YouVersionPlatformConfiguration.permittedVersionIds = undefined;
    YouVersionPlatformConfiguration.excludedVersionIds = undefined;
    YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
    resetVersionFilterWarnings();
  };
  return { warn, cleanup };
}

describe('useVersionFilterWarning', () => {
  it('warns once per hidden version id and stays silent for permitted ones', () => {
    const { warn, cleanup } = setup({ excludedVersionIds: [206] });

    const hidden = renderHook(() => useVersionFilterWarning(206, 'en'));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('206');

    // Re-rendering, and a second component rendering the same version, must not
    // repeat the message — the ledger is module-scoped, not per hook instance.
    hidden.rerender();
    renderHook(() => useVersionFilterWarning(206, 'en'));
    expect(warn).toHaveBeenCalledTimes(1);

    // A different, permitted version says nothing at all.
    renderHook(() => useVersionFilterWarning(111, 'en'));
    expect(warn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('holds the warning until the language tag loads, then warns on a real mismatch', () => {
    const { warn, cleanup } = setup({ permittedLanguageTags: ['en'] });

    // No tag yet: rejecting here would be an artifact of the unloaded version
    // data, not of the version's language.
    const { rerender } = renderHook<void, { languageTag?: string }>(
      ({ languageTag }) => useVersionFilterWarning(555, languageTag),
      { initialProps: {} },
    );
    expect(warn).not.toHaveBeenCalled();

    // Tag loads and really is outside the allowlist.
    rerender({ languageTag: 'es' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('555');

    cleanup();
  });

  it('warns before the tag loads when no language filter is active', () => {
    const { warn, cleanup } = setup({ excludedVersionIds: [777] });

    renderHook(() => useVersionFilterWarning(777, undefined));

    // Without `permittedLanguageTags` the predicate needs no tag, so there is
    // nothing to wait for.
    expect(warn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('stays silent in production builds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    // Re-import both modules from the fresh graph: the production gate is a
    // module-level constant, and the hook must read the same core copy.
    const [{ useVersionFilterWarning: hookInProd }, { YouVersionPlatformConfiguration: config }] =
      await Promise.all([
        import('./use-version-filter-warning'),
        import('@youversion/platform-core'),
      ]);
    config.excludedVersionIds = [206];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    renderHook(() => hookInProd(206, 'en'));

    expect(warn).not.toHaveBeenCalled();

    config.excludedVersionIds = undefined;
    warn.mockRestore();
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
