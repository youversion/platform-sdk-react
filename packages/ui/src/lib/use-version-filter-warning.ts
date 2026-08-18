import { useEffect } from 'react';
import { isVersionPermitted, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { IS_PRODUCTION } from './constants';

// Warn-once ledger, module-scoped so a remount or a sibling component rendering
// the same version doesn't repeat the message.
const warnedVersionIds = new Set<number>();

/** Test seam: clears the warn-once ledger. */
export function resetVersionFilterWarnings(): void {
  warnedVersionIds.clear();
}

/**
 * Dev-only nudge when a component renders a Bible version the configured
 * filters would hide.
 *
 * The version still renders. Filters are list-only (ADR-0005) — they shape what
 * the SDK offers in the picker and in `getVersions`/`getLanguages`, and never
 * block rendering a version by id. This is the guardrail for the case where
 * that divergence is a config mistake rather than a deep link.
 *
 * @param versionId The version being rendered.
 * @param languageTag The version's language tag, once its data has loaded.
 *   Pass `undefined` while loading; see the missing-tag note below.
 */
export function useVersionFilterWarning(versionId: number, languageTag?: string): void {
  useEffect(() => {
    if (IS_PRODUCTION) return;
    if (warnedVersionIds.has(versionId)) return;

    // A version's own data is the only source of its language tag, and
    // `isVersionPermitted` rejects a missing tag whenever `permittedLanguageTags`
    // is active. Before the tag loads, that rejection says nothing about the
    // version — stay quiet rather than warn wrongly.
    const languageFilterActive = YouVersionPlatformConfiguration.permittedLanguageTags !== undefined;
    if (languageTag === undefined && languageFilterActive) return;

    if (isVersionPermitted(versionId, languageTag)) return;

    warnedVersionIds.add(versionId);
    console.warn(
      `[YouVersion Platform] Bible version ${versionId} is rendering, but the configured ` +
        'version filters (permittedVersionIds / excludedVersionIds / permittedLanguageTags) ' +
        'hide it from version and language lists. Rendering is never blocked, so this is only ' +
        'a problem if the filters were meant to cover it.',
    );
  }, [versionId, languageTag]);
}
