/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, onTestFinished, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { resetVersionFilterWarnings, useVersionFilterWarning } from './use-version-filter-warning';

/**
 * Ready-to-run subject: clean ledger, clean filters, a spied `console.warn`.
 * The filters and the ledger are module-level globals, so teardown registers
 * with `onTestFinished` — it has to run even when an assertion throws, or the
 * rest of the file inherits this test's config.
 */
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
  onTestFinished(() => {
    warn.mockRestore();
    YouVersionPlatformConfiguration.permittedVersionIds = undefined;
    YouVersionPlatformConfiguration.excludedVersionIds = undefined;
    YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
    resetVersionFilterWarnings();
  });
  return { warn };
}

describe('useVersionFilterWarning', () => {
  it('warns once per hidden version id and stays silent for permitted ones', () => {
    const { warn } = setup({ excludedVersionIds: [206] });

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
  });

  it('holds the warning until the language tag loads, then warns on a real mismatch', () => {
    const { warn } = setup({ permittedLanguageTags: ['en'] });

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
  });

  it('warns before the tag loads when no language filter is active', () => {
    const { warn } = setup({ excludedVersionIds: [777] });

    renderHook(() => useVersionFilterWarning(777, undefined));

    // Without `permittedLanguageTags` the predicate needs no tag, so there is
    // nothing to wait for.
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays silent in production builds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    onTestFinished(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    // Re-import both modules from the fresh graph: the production gate is a
    // module-level constant, and the hook must read the same core copy.
    const [{ useVersionFilterWarning: hookInProd }, { YouVersionPlatformConfiguration: config }] =
      await Promise.all([
        import('./use-version-filter-warning'),
        import('@youversion/platform-core'),
      ]);
    config.excludedVersionIds = [206];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    onTestFinished(() => {
      config.excludedVersionIds = undefined;
      warn.mockRestore();
    });

    renderHook(() => hookInProd(206, 'en'));

    expect(warn).not.toHaveBeenCalled();
  });
});
